
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import "./VerifyRegistration.css";

const API_URL = "http://127.0.0.1:8000/api/v1";

export default function VerifyRegistration() {
  const navigate = useNavigate();

  // =========================================================
  // STATE
  // =========================================================

  const [registrationData, setRegistrationData] = useState(null);
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [countdown, setCountdown] = useState(0);

  // =========================================================
  // LOAD REGISTRATION SESSION
  // =========================================================

  useEffect(() => {
    try {
      const storedRegistration = sessionStorage.getItem(
        "ledgerly_registration"
      );

      console.log(
        "STORED REGISTRATION:",
        storedRegistration
      );

      if (!storedRegistration) {
        setError(
          "Registration session expired. Please register again."
        );
        return;
      }

      const parsedData = JSON.parse(storedRegistration);

      if (
        !parsedData ||
        !parsedData.email ||
        !parsedData.full_name
      ) {
        sessionStorage.removeItem(
          "ledgerly_registration"
        );

        setError(
          "Registration session expired. Please register again."
        );

        return;
      }

      setRegistrationData(parsedData);

      // Start resend countdown
      setCountdown(60);
    } catch (err) {
      console.error(
        "REGISTRATION SESSION ERROR:",
        err
      );

      sessionStorage.removeItem(
        "ledgerly_registration"
      );

      setError(
        "Registration session expired. Please register again."
      );
    }
  }, []);

  // =========================================================
  // COUNTDOWN
  // =========================================================

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  // =========================================================
  // HANDLE OTP INPUT
  // =========================================================

  const handleOtpChange = (e) => {
    const value = e.target.value;

    // Only numbers
    const numericValue = value.replace(/\D/g, "");

    // Maximum 6 digits
    if (numericValue.length <= 6) {
      setOtp(numericValue);
      setError("");
      setSuccess("");
    }
  };

  // =========================================================
  // VERIFY OTP
  // =========================================================

  const handleVerify = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!registrationData) {
      setError(
        "Registration session expired. Please register again."
      );
      return;
    }

    if (!otp.trim()) {
      setError("Please enter the OTP.");
      return;
    }

    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...registrationData,
        otp: otp.trim(),
      };

      console.log("VERIFY REGISTRATION REQUEST:", {
        ...payload,
        password: "********",
        otp: "******",
      });

      const response = await axios.post(
        `${API_URL}/auth/verify-registration`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        "VERIFY REGISTRATION RESPONSE:",
        response.data
      );

      // =====================================================
      // SUCCESS
      // =====================================================

      setSuccess(
        response.data?.message ||
          "Registration successful. Your account has been created."
      );

      // =====================================================
      // REMOVE TEMP REGISTRATION DATA
      // =====================================================

      sessionStorage.removeItem(
        "ledgerly_registration"
      );

      sessionStorage.removeItem(
        "ledgerly_registration_email"
      );

      sessionStorage.removeItem(
        "ledgerly_registration_mobile"
      );

      // =====================================================
      // STORE TOKEN IF BACKEND RETURNS ONE
      // =====================================================

      const token =
        response.data?.access_token ||
        response.data?.token;

      if (token) {
        localStorage.setItem(
          "access_token",
          token
        );
      }

      // =====================================================
      // REDIRECT
      // =====================================================

      setTimeout(() => {
        navigate(
          token
            ? "/dashboard"
            : "/login",
          { replace: true }
        );
      }, 1200);
    } catch (err) {
      console.error(
        "VERIFY OTP ERROR:",
        err
      );

      const responseData = err.response?.data;
      const detail = responseData?.detail;

      if (Array.isArray(detail)) {
        setError(
          detail
            .map(
              (item) =>
                item?.msg ||
                "Invalid verification data."
            )
            .join(", ")
        );
      } else {
        setError(
          detail ||
            "Invalid or expired OTP. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // RESEND OTP
  // =========================================================

  const handleResend = async () => {
    setError("");
    setSuccess("");

    if (!registrationData) {
      setError(
        "Registration session expired. Please register again."
      );
      return;
    }

    if (countdown > 0) {
      return;
    }

    try {
      setResending(true);

      const response = await axios.post(
        `${API_URL}/auth/resend-otp`,
        {
          email: registrationData.email,
          mobile_number:
            registrationData.mobile_number,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        "RESEND OTP RESPONSE:",
        response.data
      );

      setSuccess(
        response.data?.message ||
          "A new OTP has been sent."
      );

      setOtp("");

      setCountdown(60);
    } catch (err) {
      console.error(
        "RESEND OTP ERROR:",
        err
      );

      const detail =
        err.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(
          detail
            .map(
              (item) =>
                item?.msg ||
                "Unable to resend OTP."
            )
            .join(", ")
        );
      } else {
        setError(
          detail ||
            "Unable to resend OTP. Please try again."
        );
      }
    } finally {
      setResending(false);
    }
  };

  // =========================================================
  // GO BACK TO REGISTER
  // =========================================================

  const handleBackToRegister = () => {
    sessionStorage.removeItem(
      "ledgerly_registration"
    );

    sessionStorage.removeItem(
      "ledgerly_registration_email"
    );

    sessionStorage.removeItem(
      "ledgerly_registration_mobile"
    );

    navigate("/register");
  };

  // =========================================================
  // DISPLAY EMAIL
  // =========================================================

  const email =
    registrationData?.email ||
    sessionStorage.getItem(
      "ledgerly_registration_email"
    );

  // =========================================================
  // SESSION EXPIRED SCREEN
  // =========================================================

  if (!registrationData) {
    return (
      <main className="verify-page">

        <section className="verify-card">

          <div className="verify-brand">
            <div className="verify-logo">
              LF
            </div>

            <div>
              <strong>Ledgerly</strong>
              <small>
                SMART BOOKKEEPING
              </small>
            </div>
          </div>

          <div className="verify-icon error-icon">
            <ShieldCheck />
          </div>

          <div className="verify-heading">

            <span>
              VERIFICATION
            </span>

            <h1>
              Session expired
            </h1>

            <p>
              Your registration information
              could not be found. Please go
              back and create your account
              again.
            </p>

          </div>

          {error && (
            <div className="verify-alert error">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            className="verify-primary-button"
            onClick={handleBackToRegister}
          >
            Register again
            <ArrowRight size={18} />
          </button>

          <div className="verify-back-link">
            <Link to="/login">
              <ArrowLeft size={16} />
              Back to login
            </Link>
          </div>

        </section>

      </main>
    );
  }

  // =========================================================
  // MAIN OTP PAGE
  // =========================================================

  return (
    <main className="verify-page">

      <section className="verify-card">

        {/* ===================================================
            BRAND
        =================================================== */}

        <div className="verify-brand">

          <div className="verify-logo">
            LF
          </div>

          <div>
            <strong>Ledgerly</strong>

            <small>
              SMART BOOKKEEPING
            </small>
          </div>

        </div>


        {/* ===================================================
            ICON
        =================================================== */}

        <div className="verify-icon">

          <Mail />

        </div>


        {/* ===================================================
            HEADING
        =================================================== */}

        <div className="verify-heading">

          <span>
            EMAIL VERIFICATION
          </span>

          <h1>
            Verify your account
          </h1>

          <p>
            We sent a 6-digit verification
            code to
          </p>

          <strong className="verify-email">
            {email}
          </strong>

        </div>


        {/* ===================================================
            ALERTS
        =================================================== */}

        {error && (

          <div className="verify-alert error">

            <span>⚠</span>

            <span>
              {error}
            </span>

          </div>

        )}


        {success && (

          <div className="verify-alert success">

            <CheckCircle2 size={17} />

            <span>
              {success}
            </span>

          </div>

        )}


        {/* ===================================================
            OTP FORM
        =================================================== */}

        <form
          onSubmit={handleVerify}
          className="verify-form"
        >

          <label htmlFor="otp">
            Verification code
          </label>

          <input
            id="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={otp}
            onChange={handleOtpChange}
            disabled={loading}
            autoFocus
          />

          <p className="otp-hint">
            Enter the 6-digit code sent to your
            email or mobile number.
          </p>


          {/* =================================================
              VERIFY BUTTON
          ================================================= */}

          <button
            type="submit"
            className="verify-primary-button"
            disabled={
              loading ||
              otp.length !== 6
            }
          >

            {loading ? (
              <>
                <span className="verify-spinner" />
                Verifying...
              </>
            ) : (
              <>
                Verify and create account
                <ArrowRight size={18} />
              </>
            )}

          </button>

        </form>


        {/* ===================================================
            RESEND
        =================================================== */}

        <div className="resend-section">

          <span>
            Didn't receive the code?
          </span>

          <button
            type="button"
            onClick={handleResend}
            disabled={
              resending ||
              countdown > 0
            }
          >

            <RefreshCw
              size={15}
              className={
                resending
                  ? "resend-spinning"
                  : ""
              }
            />

            {resending
              ? "Sending..."
              : countdown > 0
              ? `Resend in ${countdown}s`
              : "Resend OTP"}

          </button>

        </div>


        {/* ===================================================
            BACK
        =================================================== */}

        <button
          type="button"
          className="verify-back-button"
          onClick={handleBackToRegister}
          disabled={loading}
        >

          <ArrowLeft size={16} />

          Change registration details

        </button>


        {/* ===================================================
            SECURITY
        =================================================== */}

        <div className="verify-security">

          <ShieldCheck size={16} />

          <span>
            Your verification code is securely
            handled by Ledgerly.
          </span>

        </div>

      </section>

    </main>
  );
}
