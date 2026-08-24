
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

import api from "../api/api";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      // -----------------------------------------
      // VALIDATION
      // -----------------------------------------

      if (!normalizedEmail) {
        setError("Please enter your email address.");
        setLoading(false);
        return;
      }

      if (!password) {
        setError("Please enter your password.");
        setLoading(false);
        return;
      }

      // -----------------------------------------
      // CLEAR OLD AUTH DATA
      // -----------------------------------------

      localStorage.removeItem("access");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("userEmail");

      // -----------------------------------------
      // CLEAR OLD WELCOME FLAG
      //
      // Every successful login gets a fresh
      // welcome screen.
      // -----------------------------------------

      sessionStorage.removeItem("ledgerly_show_welcome");

      // -----------------------------------------
      // FASTAPI LOGIN
      // -----------------------------------------

      const formData = new URLSearchParams();

      formData.append("username", normalizedEmail);
      formData.append("password", password);

      const response = await api.post(
        "/auth/login",
        formData,
        {
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
        }
      );

      console.log("LOGIN RESPONSE:", response.data);

      // -----------------------------------------
      // GET TOKENS
      // -----------------------------------------

      const accessToken =
        response.data?.access_token;

      const refreshToken =
        response.data?.refresh_token;

      if (!accessToken) {
        throw new Error(
          "Login succeeded, but no access token was returned."
        );
      }

      // -----------------------------------------
      // SAVE ACCESS TOKEN
      // -----------------------------------------

      localStorage.setItem(
        "access",
        accessToken
      );

      localStorage.setItem(
        "access_token",
        accessToken
      );

      if (refreshToken) {
        localStorage.setItem(
          "refresh",
          refreshToken
        );

        localStorage.setItem(
          "refresh_token",
          refreshToken
        );
      }

      localStorage.setItem(
        "userEmail",
        normalizedEmail
      );

      console.log(
        "ACCESS TOKEN SAVED:",
        !!localStorage.getItem("access")
      );

      // -----------------------------------------
      // GET CURRENT USER
      // -----------------------------------------

      try {
        const meResponse =
          await api.get("/auth/me");

        console.log(
          "CURRENT USER:",
          meResponse.data
        );

       const currentUser =
       meResponse.data?.user || meResponse.data;

       if (currentUser) {
       localStorage.setItem(
        "user",
       JSON.stringify(currentUser)
      );
    }
      } catch (meError) {
        console.error(
          "Unable to load current user:",
          meError
        );

        // Do not destroy the token.
        // ProtectedRoute will verify it.
      }

      // -----------------------------------------
      // IMPORTANT
      // -----------------------------------------
      // Tell Welcome that this is a fresh login.
      // sessionStorage lasts only for this browser
      // session and is cleared when the tab/session
      // ends.
      // -----------------------------------------

      sessionStorage.setItem(
        "ledgerly_show_welcome",
        "true"
      );

      console.log(
        "LOGIN SUCCESS → GOING TO WELCOME"
      );

      // -----------------------------------------
      // NAVIGATE TO WELCOME
      // -----------------------------------------

      navigate("/welcome", {
        replace: true,
      });

    } catch (err) {
      console.error(
        "LOGIN ERROR:",
        err
      );

      // -----------------------------------------
      // 401
      // -----------------------------------------

      if (err.response?.status === 401) {
        setError(
          "Invalid email or password. Please check your login details."
        );
      }

      // -----------------------------------------
      // 403
      // -----------------------------------------

      else if (err.response?.status === 403) {
        setError(
          err.response?.data?.detail ||
            "Your account is inactive."
        );
      }

      // -----------------------------------------
      // FASTAPI DETAIL
      // -----------------------------------------

      else if (
        err.response?.data?.detail
      ) {
        const detail =
          err.response.data.detail;

        if (Array.isArray(detail)) {
          setError(
            detail
              .map(
                (item) =>
                  item?.msg || item
              )
              .join(", ")
          );
        } else {
          setError(String(detail));
        }
      }

      // -----------------------------------------
      // NETWORK ERROR
      // -----------------------------------------

      else if (
        err.code === "ERR_NETWORK" ||
        err.message === "Network Error"
      ) {
        setError(
          "Unable to connect to the backend. Make sure FastAPI is running."
        );
      }

      // -----------------------------------------
      // OTHER ERROR
      // -----------------------------------------

      else {
        setError(
          err.message ||
            "Unable to sign in. Please try again."
        );
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">

      {/* LEFT BRAND */}

      <section className="login-brand">

        <div className="login-logo">
          <img
            src="/pwa-192x192.png"
            alt="Ledgerly"
          />
        </div>

        <div className="brand-name">
          <span>Ledgerly</span>
        </div>

        <p className="brand-tagline">
          Smart bookkeeping for a clearer
          financial future.
        </p>

        <div className="brand-features">

          <div>
            <strong>01</strong>
            <span>
              Track your finances
            </span>
          </div>

          <div>
            <strong>02</strong>
            <span>
              Understand your spending
            </span>
          </div>

          <div>
            <strong>03</strong>
            <span>
              Make better decisions
            </span>
          </div>

        </div>

      </section>

      {/* LOGIN PANEL */}

      <section className="login-panel">

        <div className="login-container">

          {/* MOBILE BRAND */}

          <div className="mobile-brand">

            <div className="brand-logo">
              LF
            </div>

            <div className="brand-name">
              Ledgerly
            </div>

          </div>

          {/* HEADING */}

          <div className="login-heading">

            <span className="login-eyebrow">
              WELCOME BACK
            </span>

            <h1>
              Sign in to your workspace
            </h1>

            <p>
              Manage your books, expenses and
              financial insights from one place.
            </p>

          </div>

          {/* ERROR */}

          {error && (
            <div className="login-error">

              <span>⚠</span>

              <span>
                {error}
              </span>

            </div>
          )}

          {/* LOGIN FORM */}

          <form
            className="login-form"
            onSubmit={handleSubmit}
          >

            {/* EMAIL */}

            <div className="form-group">

              <label htmlFor="email">
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                autoComplete="email"
                disabled={loading}
                required
              />

            </div>

            {/* PASSWORD */}

            <div className="form-group">

              <div className="password-label">

                <label htmlFor="password">
                  Password
                </label>

                <button
                  type="button"
                  className="forgot-button"
                  onClick={() =>
                    navigate("/forgot-password")
                  }
                  disabled={loading}
                >
                  Forgot password?
                </button>

              </div>

              <div className="password-input-wrapper">

                <input
                  id="password"
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />

                <button
                  type="button"
                  className="password-visibility-button"
                  onClick={() =>
                    setShowPassword(
                      (previous) =>
                        !previous
                    )
                  }
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  title={
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

            {/* SIGN IN BUTTON */}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >

              {loading ? (
                <>
                  <span className="button-spinner" />

                  <span>
                    Signing in...
                  </span>
                </>
              ) : (
                <>
                  <span>
                    Sign in
                  </span>

                  <span className="login-arrow">
                    →
                  </span>
                </>
              )}

            </button>

          </form>

          {/* REGISTER */}

          <div className="register-prompt">

            <span>
              New to Ledgerly?
            </span>

            <Link to="/register">
              Create your account
              <span>→</span>
            </Link>

          </div>

          {/* SECURITY */}

          <div className="login-security">

            <span>
              🔒
            </span>

            <span>
              Your financial data is protected.
            </span>

          </div>

        </div>

      </section>

    </main>
  );
}
