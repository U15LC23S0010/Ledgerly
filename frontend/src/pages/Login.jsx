import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

import api from "../api/api";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append("username", normalizedEmail);
      formData.append("password", password);

      // 1. Authenticate the user.
      const response = await api.post(
        "/auth/login",
        formData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const accessToken =
        response.data?.access_token ||
        response.data?.access ||
        response.data?.token;

      const refreshToken =
        response.data?.refresh_token ||
        response.data?.refresh;

      if (!accessToken) {
        throw new Error(
          "The server did not return an access token. Please try again."
        );
      }

      // 2. Save the token before making authenticated requests.
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("access", accessToken);
      localStorage.setItem("token", accessToken);
      localStorage.setItem("userEmail", normalizedEmail);

      if (refreshToken) {
        localStorage.setItem("refresh_token", refreshToken);
        localStorage.setItem("refresh", refreshToken);
      }

      // 3. Verify the authenticated session and retrieve the user.
      // The Axios interceptor will now attach the saved access token.
      let currentUser;

      try {
        const meResponse = await api.get("/auth/me");
        currentUser = meResponse.data?.user || meResponse.data;

        if (
          !currentUser ||
          typeof currentUser !== "object" ||
          Array.isArray(currentUser)
        ) {
          throw new Error("The server returned invalid user information.");
        }

        localStorage.setItem("user", JSON.stringify(currentUser));
      } catch (meError) {
        // Do not leave invalid or unverified credentials behind.
        localStorage.removeItem("access_token");
        localStorage.removeItem("access");
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("refresh");
        localStorage.removeItem("user");
        localStorage.removeItem("userEmail");

        if (meError.response?.status === 401) {
          throw new Error(
            "Your login could not be verified. Please sign in again."
          );
        }

        if (meError.code === "ERR_NETWORK") {
          throw new Error(
            "Unable to verify your session. Please check your connection and try again."
          );
        }

        throw new Error(
          "Unable to verify your account. Please try again."
        );
      }

      // 4. Set the welcome flag and navigate only after verification.
      sessionStorage.setItem("ledgerly_show_welcome", "true");

      const requestedPath = location.state?.from;
      const destination =
        requestedPath &&
        requestedPath !== "/login" &&
        requestedPath !== "/register"
          ? requestedPath
          : "/dashboard";

      navigate(destination, { replace: true });
    } catch (err) {
      console.error("Ledgerly login failed:", err);

      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 401) {
        setError("Invalid email or password. Please check your login details.");
      } else if (status === 403) {
        setError(
          typeof detail === "string"
            ? detail
            : "Your account is inactive."
        );
      } else if (Array.isArray(detail)) {
        setError(
          detail.map((item) => item?.msg || String(item)).join(", ")
        );
      } else if (typeof detail === "string") {
        setError(detail);
      } else if (
        err.code === "ERR_NETWORK" ||
        err.message === "Network Error"
      ) {
        setError(
          "Unable to connect to the backend. Please check your connection."
        );
      } else {
        setError(
          err.message || "Unable to sign in. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="login-logo">
          <img src="/pwa-192x192.png" alt="Ledgerly" />
        </div>

        <div className="brand-name">
          <span>Ledgerly</span>
        </div>

        <p className="brand-tagline">
          Smart bookkeeping for a clearer financial future.
        </p>

        <div className="brand-features">
          <div>
            <strong>01</strong>
            <span>Track your finances</span>
          </div>
          <div>
            <strong>02</strong>
            <span>Understand your spending</span>
          </div>
          <div>
            <strong>03</strong>
            <span>Make better decisions</span>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-container">
          <div className="mobile-brand">
            <div className="brand-logo">
              <img src="/ledgerly-30x30.png" alt="Ledgerly" />
            </div>
            <div className="brand-name">Ledgerly</div>
          </div>

          <div className="login-heading">
            <span className="login-eyebrow">WELCOME BACK</span>
            <h1>Sign in to your workspace</h1>
            <p>
              Manage your books, expenses and financial insights
              from one place.
            </p>
          </div>

          {error && (
            <div className="login-error" role="alert">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email address</label>
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
                autoComplete="username"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <div className="password-label">
                <label htmlFor="password">Password</label>
                <button
                  type="button"
                  className="forgot-button"
                  onClick={() => navigate("/forgot-password")}
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>

              <div className="password-input-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
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
                    setShowPassword((previous) => !previous)
                  }
                  disabled={loading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="button-spinner" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <span className="login-arrow">→</span>
                </>
              )}
            </button>
          </form>

          <div className="register-prompt">
            <span>New to Ledgerly?</span>
            <Link to="/register">
              Create your account <span>→</span>
            </Link>
          </div>

          <div className="login-security">
            <span>🔒</span>
            <span>Your financial data is protected.</span>
          </div>
        </div>
      </section>
    </main>
  );
}