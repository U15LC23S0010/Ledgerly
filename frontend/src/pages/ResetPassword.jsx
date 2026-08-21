import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import axios from "axios";

import "./ResetPassword.css";

const API_URL = "http://127.0.0.1:8000/api/v1";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [otpVerified, setOtpVerified] = useState(false);

  const [loading, setLoading] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================================================
  // LOAD FORGOT PASSWORD SESSION
  // =========================================================

  useEffect(() => {
    const savedEmail = sessionStorage.getItem(
      "ledgerly_forgot_password_email"
    );

    const savedOtp = sessionStorage.getItem(
      "ledgerly_password_reset_otp"
    );

    const savedOtpVerified =
      sessionStorage.getItem(
        "ledgerly_password_reset_otp_verified"
      );

    if (!savedEmail) {
      navigate("/forgot-password", {
        replace: true,
      });

      return;
    }

    setEmail(savedEmail);

    // Restore OTP if the page was refreshed
    if (savedOtp) {
      setOtp(savedOtp);
    }

    if (savedOtpVerified === "true") {
      setOtpVerified(true);
    }
  }, [navigate]);


  // =========================================================
  // VERIFY OTP
  // =========================================================

  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const otpValue = otp.trim();

    if (!otpValue) {
      setError("Please enter the verification code.");
      return;
    }

    if (!/^\d{6}$/.test(otpValue)) {
      setError("Verification code must contain 6 digits.");
      return;
    }

    try {
      setVerifyingOtp(true);

      const response = await axios.post(
        `${API_URL}/auth/verify-forgot-password-otp`,
        {
          email: email.trim().toLowerCase(),
          otp: otpValue,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        "FORGOT PASSWORD OTP RESPONSE:",
        response.data
      );

      // =====================================================
      // IMPORTANT
      // Backend does NOT return a reset token.
      //
      // The backend verifies the OTP here and expects the
      // same email + OTP again when /reset-password is called.
      // =====================================================

      setOtpVerified(true);

      // Store OTP so it survives a page refresh.
      sessionStorage.setItem(
        "ledgerly_password_reset_otp",
        otpValue
      );

      sessionStorage.setItem(
        "ledgerly_password_reset_otp_verified",
        "true"
      );

      setSuccess(
        response.data?.message ||
          "Verification successful. You can now create a new password."
      );

    } catch (err) {
      console.error(
        "VERIFY FORGOT PASSWORD OTP ERROR:",
        err
      );

      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(
          detail
            .map((item) => item?.msg || "Invalid input")
            .join(", ")
        );
      } else if (detail) {
        setError(String(detail));
      } else if (
        err.code === "ERR_NETWORK" ||
        err.message === "Network Error"
      ) {
        setError(
          "Unable to connect to the backend. Make sure FastAPI is running."
        );
      } else {
        setError(
          err.message ||
            "Invalid or expired verification code."
        );
      }
    } finally {
      setVerifyingOtp(false);
    }
  };


  // =========================================================
  // RESET PASSWORD
  // =========================================================

  const handleResetPassword = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const otpValue =
      otp.trim() ||
      sessionStorage.getItem(
        "ledgerly_password_reset_otp"
      );

    if (!otpValue) {
      setError(
        "Verification code is missing. Please request a new code."
      );
      return;
    }

    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      setError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      // =====================================================
      // BACKEND EXPECTS:
      //
      // email
      // otp
      // new_password
      // =====================================================

      const response = await axios.post(
        `${API_URL}/auth/reset-password`,
        {
          email: email.trim().toLowerCase(),
          otp: otpValue,
          new_password: newPassword,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        "RESET PASSWORD RESPONSE:",
        response.data
      );

      setSuccess(
        response.data?.message ||
          "Password reset successfully. You can now login."
      );

      // =====================================================
      // CLEAR PASSWORD RESET SESSION
      // =====================================================

      sessionStorage.removeItem(
        "ledgerly_forgot_password_email"
      );

      sessionStorage.removeItem(
        "ledgerly_password_reset_otp"
      );

      sessionStorage.removeItem(
        "ledgerly_password_reset_otp_verified"
      );

      setTimeout(() => {
        navigate("/login", {
          replace: true,
        });
      }, 1500);

    } catch (err) {
      console.error(
        "RESET PASSWORD ERROR:",
        err
      );

      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(
          detail
            .map((item) => item?.msg || "Invalid input")
            .join(", ")
        );
      } else if (detail) {
        setError(String(detail));
      } else if (
        err.code === "ERR_NETWORK" ||
        err.message === "Network Error"
      ) {
        setError(
          "Unable to connect to the backend. Make sure FastAPI is running."
        );
      } else {
        setError(
          "Unable to reset your password. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };


  // =========================================================
  // RESEND OTP
  // =========================================================

  const handleResendOTP = async () => {
    setError("");
    setSuccess("");

    try {
      setVerifyingOtp(true);

      const response = await axios.post(
        `${API_URL}/auth/forgot-password/resend`,
        {
          email: email.trim().toLowerCase(),
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        "RESEND PASSWORD OTP RESPONSE:",
        response.data
      );

      // Reset verification state
      setOtp("");
      setOtpVerified(false);

      sessionStorage.removeItem(
        "ledgerly_password_reset_otp"
      );

      sessionStorage.removeItem(
        "ledgerly_password_reset_otp_verified"
      );

      setSuccess(
        response.data?.message ||
          "A new verification code has been sent."
      );

    } catch (err) {
      console.error(
        "RESEND PASSWORD OTP ERROR:",
        err
      );

      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(
          detail
            .map((item) => item?.msg || "Invalid input")
            .join(", ")
        );
      } else if (detail) {
        setError(String(detail));
      } else if (
        err.code === "ERR_NETWORK" ||
        err.message === "Network Error"
      ) {
        setError(
          "Unable to connect to the backend. Make sure FastAPI is running."
        );
      } else {
        setError(
          "Unable to send a new verification code."
        );
      }
    } finally {
      setVerifyingOtp(false);
    }
  };


  return (
    <main className="reset-password-page">

      {/* =====================================================
          LEFT BRAND
      ===================================================== */}

      <section className="reset-brand">

        <div className="reset-brand-logo">
          LF
        </div>

        <div className="reset-brand-name">
          Ledgerly
        </div>

        <p>
          Smart bookkeeping for a clearer
          financial future.
        </p>

        <div className="reset-features">

          <div>
            <strong>01</strong>
            <span>Secure verification</span>
          </div>

          <div>
            <strong>02</strong>
            <span>Password protection</span>
          </div>

          <div>
            <strong>03</strong>
            <span>Protected financial workspace</span>
          </div>

        </div>

      </section>


      {/* =====================================================
          RESET PANEL
      ===================================================== */}

      <section className="reset-panel">

        <div className="reset-container">

          <Link
            to="/login"
            className="reset-back"
          >
            <ArrowLeft size={15} />
            Back to sign in
          </Link>


          {/* =================================================
              ICON
          ================================================= */}

          <div className="reset-icon">

            {otpVerified ? (
              <LockKeyhole size={25} />
            ) : (
              <ShieldCheck size={25} />
            )}

          </div>


          {/* =================================================
              HEADING
          ================================================= */}

          <div className="reset-heading">

            <span>
              {otpVerified
                ? "NEW PASSWORD"
                : "EMAIL VERIFICATION"}
            </span>

            <h1>
              {otpVerified
                ? "Create a new password"
                : "Verify your account"}
            </h1>

            <p>
              {otpVerified
                ? "Choose a new secure password for your Ledgerly account."
                : `Enter the 6-digit verification code sent to ${email}.`}
            </p>

          </div>


          {/* =================================================
              ERROR
          ================================================= */}

          {error && (
            <div className="reset-alert error">

              <span>⚠</span>

              <span>
                {error}
              </span>

            </div>
          )}


          {/* =================================================
              SUCCESS
          ================================================= */}

          {success && (
            <div className="reset-alert success">

              <CheckCircle2 size={16} />

              <span>
                {success}
              </span>

            </div>
          )}


          {/* =================================================
              OTP FORM
          ================================================= */}

          {!otpVerified && (

            <form
              className="reset-form"
              onSubmit={handleVerifyOTP}
            >

              <div className="reset-form-group">

                <label htmlFor="otp">
                  Verification code
                </label>

                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => {

                    const value =
                      e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6);

                    setOtp(value);

                    setError("");
                    setSuccess("");

                  }}
                  autoComplete="one-time-code"
                  disabled={verifyingOtp}
                  required
                />

              </div>


              <button
                type="submit"
                className="reset-button"
                disabled={verifyingOtp}
              >

                {verifyingOtp ? (
                  <>
                    <span className="reset-spinner" />
                    Verifying code...
                  </>
                ) : (
                  <>
                    Verify code
                    <ArrowRight size={17} />
                  </>
                )}

              </button>


              <button
                type="button"
                className="resend-button"
                onClick={handleResendOTP}
                disabled={verifyingOtp}
              >
                Didn't receive the code? Resend OTP
              </button>

            </form>

          )}


          {/* =================================================
              NEW PASSWORD FORM
          ================================================= */}

          {otpVerified && (

            <form
              className="reset-form"
              onSubmit={handleResetPassword}
            >

              {/* NEW PASSWORD */}

              <div className="reset-form-group">

                <label htmlFor="new-password">
                  New password
                </label>

                <div className="reset-password-wrapper">

                  <LockKeyhole size={17} />

                  <input
                    id="new-password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Create a new password"
                    value={newPassword}
                    onChange={(e) => {

                      setNewPassword(e.target.value);

                      setError("");
                      setSuccess("");

                    }}
                    autoComplete="new-password"
                    disabled={loading}
                    required
                  />

                  <button
                    type="button"
                    className="reset-password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (previous) => !previous
                      )
                    }
                    disabled={loading}
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >

                    {showPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}

                  </button>

                </div>

              </div>


              {/* CONFIRM PASSWORD */}

              <div className="reset-form-group">

                <label htmlFor="confirm-password">
                  Confirm new password
                </label>

                <div className="reset-password-wrapper">

                  <LockKeyhole size={17} />

                  <input
                    id="confirm-password"
                    type={
                      showConfirm
                        ? "text"
                        : "password"
                    }
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => {

                      setConfirmPassword(e.target.value);

                      setError("");
                      setSuccess("");

                    }}
                    autoComplete="new-password"
                    disabled={loading}
                    required
                  />

                  <button
                    type="button"
                    className="reset-password-toggle"
                    onClick={() =>
                      setShowConfirm(
                        (previous) => !previous
                      )
                    }
                    disabled={loading}
                    aria-label={
                      showConfirm
                        ? "Hide password"
                        : "Show password"
                    }
                  >

                    {showConfirm ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}

                  </button>

                </div>

              </div>


              <div className="reset-password-hint">
                Use at least 6 characters.
              </div>


              <button
                type="submit"
                className="reset-button"
                disabled={loading}
              >

                {loading ? (
                  <>
                    <span className="reset-spinner" />
                    Updating password...
                  </>
                ) : (
                  <>
                    Reset password
                    <ArrowRight size={17} />
                  </>
                )}

              </button>

            </form>

          )}


          {/* =================================================
              SECURITY
          ================================================= */}

          <div className="reset-security">
            🔒 Your password is securely protected by Ledgerly.
          </div>

        </div>

      </section>

    </main>
  );
}