import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Mail,
} from "lucide-react";
import axios from "axios";

import "./ForgotPassword.css";

const API_URL = import.meta.env.VITE_API_BASE_URL;

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

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_URL}/auth/forgot-password`,
        {
          email: cleanEmail,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        "FORGOT PASSWORD RESPONSE:",
        response.data
      );

      // Save email for ResetPassword.jsx
      sessionStorage.setItem(
        "ledgerly_forgot_password_email",
        cleanEmail
      );

      // Clear any old reset token
      sessionStorage.removeItem(
        "ledgerly_password_reset_token"
      );

      setSuccess(
        response.data?.message ||
          "Verification code sent successfully."
      );

      // Go to OTP verification page
      setTimeout(() => {
        navigate("/reset-password");
      }, 500);

    } catch (err) {
      console.error(
        "FORGOT PASSWORD ERROR:",
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
          "Unable to send verification code."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="forgot-page">

      <section className="forgot-card">

        {/* LOGO */}

        <div className="forgot-logo">
          LF
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
            Enter your registered email address
            and we'll send you a verification code.
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