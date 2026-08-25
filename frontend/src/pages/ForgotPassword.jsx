import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Mail,
} from "lucide-react";

import api from "../api/api";

import "./ForgotPassword.css";

// =========================================================
// COMPONENT
// =========================================================

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================================================
  // SEND OTP
  // =========================================================

  const sendOTP = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const cleanEmail = email.trim().toLowerCase();

    // -------------------------------------------------------
    // EMAIL VALIDATION
    // -------------------------------------------------------

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      console.log("FORGOT PASSWORD REQUEST:", {
        email: cleanEmail,
      });

      // -----------------------------------------------------
      // SEND OTP
      // -----------------------------------------------------

      const response = await api.post(
        "/auth/forgot-password",
        {
          email: cleanEmail,
        },
        {
          timeout: 30000,
        }
      );

      console.log(
        "FORGOT PASSWORD RESPONSE:",
        response.data
      );

      // -----------------------------------------------------
      // SAVE EMAIL FOR OTP / RESET PAGE
      // -----------------------------------------------------

      sessionStorage.setItem(
        "ledgerly_forgot_password_email",
        cleanEmail
      );

      // Remove old reset token
      sessionStorage.removeItem(
        "ledgerly_password_reset_token"
      );

      // -----------------------------------------------------
      // SUCCESS
      // -----------------------------------------------------

      setSuccess(
        response.data?.message ||
          "Verification code sent successfully."
      );

      // -----------------------------------------------------
      // GO TO RESET PASSWORD PAGE
      // -----------------------------------------------------

      setTimeout(() => {
        navigate("/reset-password");
      }, 700);

    } catch (err) {
      console.error(
        "FORGOT PASSWORD ERROR:",
        err
      );

      // -----------------------------------------------------
      // BACKEND ERROR
      // -----------------------------------------------------

      if (err.response) {
        console.error(
          "STATUS:",
          err.response.status
        );

        console.error(
          "BACKEND RESPONSE:",
          err.response.data
        );

        const detail =
          err.response.data?.detail;

        if (Array.isArray(detail)) {
          setError(
            detail
              .map(
                (item) =>
                  item?.msg ||
                  "Invalid input"
              )
              .join(", ")
          );
        } else if (detail) {
          setError(String(detail));
        } else {
          setError(
            `Server error (${err.response.status}). Please try again.`
          );
        }

        return;
      }

      // -----------------------------------------------------
      // TIMEOUT
      // -----------------------------------------------------

      if (
        err.code === "ECONNABORTED" ||
        err.code === "ETIMEDOUT"
      ) {
        setError(
          "The verification service took too long to respond. Please try again."
        );
        return;
      }

      // -----------------------------------------------------
      // NETWORK ERROR
      // -----------------------------------------------------

      if (
        err.code === "ERR_NETWORK" ||
        err.message === "Network Error"
      ) {
        setError(
          "Unable to connect to the verification service."
        );
        return;
      }

      // -----------------------------------------------------
      // UNKNOWN ERROR
      // -----------------------------------------------------

      setError(
        "Unable to send verification code. Please try again."
      );

    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <main className="forgot-page">

      <section className="forgot-card">

        {/* LOGO */}

        <div className="forgot-logo">
          <img
            src="/pwa-70x70.png"
            alt="Ledgerly"
          />
        </div>

        {/* HEADING */}

        <div className="forgot-heading">

          <span>
            ACCOUNT RECOVERY
          </span>

          <h1>
            Forgot your password?
          </h1>

          <p>
            Enter your registered email
            address and we'll send you a
            verification code.
          </p>

        </div>

        {/* ERROR */}

        {error && (
          <div className="forgot-alert error">
            ⚠ {error}
          </div>
        )}

        {/* SUCCESS */}

        {success && (
          <div className="forgot-alert success">
            {success}
          </div>
        )}

        {/* FORM */}

        <form onSubmit={sendOTP}>

          <label htmlFor="forgot-email">
            Email address
          </label>

          <div className="forgot-input">

            <Mail size={17} />

            <input
              id="forgot-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
                setSuccess("");
              }}
              autoComplete="email"
              disabled={loading}
              required
            />

          </div>

          <button
            type="submit"
            className="forgot-button-main"
            disabled={loading}
          >

            {loading ? (
              <>
                <span className="forgot-spinner" />
                Sending code...
              </>
            ) : (
              <>
                Send verification code
                <ArrowRight size={17} />
              </>
            )}

          </button>

        </form>

        {/* BACK */}

        <div className="forgot-back">

          <Link to="/login">

            <ArrowLeft size={15} />

            Back to sign in

          </Link>

        </div>

      </section>

    </main>
  );
}