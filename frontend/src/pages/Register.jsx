
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  User,
  X,
  FileText,
  ShieldCheck,
  Shield,
  Phone,
} from "lucide-react";

import "./Register.css";

import api from "../api/api";



export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    mobile_number: "",
    password: "",
    company_name: "",
  });

  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [role, setRole] = useState("user");
  const [adminCode, setAdminCode] = useState("");

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");


  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  // =========================================================
  // VALIDATE FORM
  // =========================================================

  const validateForm = () => {
    if (
      !form.full_name.trim() ||
      !form.email.trim() ||
      !form.mobile_number.trim() ||
      !form.password ||
      !form.company_name.trim()
    ) {
      setError("Please complete all required fields.");
      return false;
    }

    if (form.full_name.trim().length < 2) {
      setError("Please enter a valid full name.");
      return false;
    }

    if (form.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return false;
    }

    if (form.password !== confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }

    const mobile = form.mobile_number.trim();

    if (mobile.length < 10 || mobile.length > 15) {
      setError("Please enter a valid mobile number.");
      return false;
    }

    if (!acceptedTerms) {
      setError(
        "Please agree to the Ledgerly Terms of Service and Privacy Policy."
      );
      return false;
    }

    if (role === "admin" && !adminCode.trim()) {
      setError("Please enter the admin access code.");
      return false;
    }

    return true;
  };

  // =========================================================
  // REGISTER
  // =========================================================

    
const handleSubmit = async (e) => {
  e.preventDefault();

  setError("");
  setSuccess("");

  if (!validateForm()) {
    return;
  }

  setLoading(true);

  try {
    const registrationData = {
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      mobile_number: form.mobile_number.trim(),
      password: form.password,
      company_name: form.company_name.trim(),
      role: role,
      admin_code: role === "admin"
        ? adminCode.trim()
        : null,
    };

    console.log("REGISTER REQUEST:", {
      ...registrationData,
      password: "********",
    });

    // =====================================================
    // SEND REGISTRATION REQUEST
    // =====================================================

    const response = await api.post(
      "/auth/register",
      registrationData,
      {
        headers: {
          "Content-Type": "application/json",
        },

        timeout: 60000,
      }
    );

    console.log("REGISTER RESPONSE:", response.data);

    // =====================================================
    // SAVE REGISTRATION DATA FOR OTP PAGE
    // =====================================================

    sessionStorage.setItem(
      "ledgerly_registration",
      JSON.stringify(registrationData)
    );

    sessionStorage.setItem(
      "ledgerly_registration_email",
      registrationData.email
    );

    sessionStorage.setItem(
      "ledgerly_registration_mobile",
      registrationData.mobile_number
    );

    // =====================================================
    // SUCCESS
    // =====================================================

    setSuccess(
      response.data?.message ||
      "Verification code sent successfully."
    );

    // =====================================================
    // GO TO OTP PAGE IMMEDIATELY
    // =====================================================

    navigate("/verify-registration", {
      replace: true,
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);

    // =====================================================
    // TIMEOUT
    // =====================================================

    if (err.code === "ECONNABORTED") {
      setError(
        "The verification service took too long to respond. Please try again."
      );

      return;
    }

    // =====================================================
    // NETWORK ERROR
    // =====================================================

    if (
      err.code === "ERR_NETWORK" ||
      err.message === "Network Error"
    ) {
      setError(
        "Unable to connect to the backend. Make sure FastAPI is running."
      );

      return;
    }

    // =====================================================
    // BACKEND ERROR
    // =====================================================

    const detail = err.response?.data?.detail;

    if (Array.isArray(detail)) {
      setError(
        detail
          .map((item) => item?.msg || "Invalid input")
          .join(", ")
      );

      return;
    }

    if (detail) {
      setError(String(detail));
      return;
    }

    // =====================================================
    // UNKNOWN ERROR
    // =====================================================

    setError(
      "Unable to send verification code. Please try again."
    );

  } finally {
    setLoading(false);
  }
};

  // =========================================================
  // USER ROLE
  // =========================================================

  const selectUserRole = () => {
    if (loading) return;

    setRole("user");
    setAdminCode("");
    setError("");
    setSuccess("");
  };

  // =========================================================
  // ADMIN ROLE
  // =========================================================

  const selectAdminRole = () => {
    if (loading) return;

    setRole("admin");
    setError("");
    setSuccess("");
  };

  // =========================================================
  // JSX
  // =========================================================

  return (
    <main className="register-page">

      {/* =====================================================
          LEFT INFORMATION PANEL
      ===================================================== */}

      <section className="register-info">

        <div className="register-info-brand">

          <div className="register-info-logo">
          <img
          src="/pwa-70x70.png"
          alt="Ledgerly"
          />
          </div>

          <div>
            <strong>
              <span>Ledgerly</span>
            </strong>

            <small>
              SMART BOOKKEEPING
            </small>
          </div>

        </div>

        <div className="register-info-content">

          <span className="register-eyebrow">
            YOUR FINANCIAL WORKSPACE
          </span>

          <h1>
            Build a clearer
            <br />
            picture of your
            <span> finances.</span>
          </h1>

          <p>
            Organize your business finances,
            monitor expenses, manage budgets
            and understand your financial activity
            from one professional workspace.
          </p>

          <div className="register-benefits">

            <div>
              <CheckCircle2 />

              <span>
                Professional bookkeeping workspace
              </span>
            </div>

            <div>
              <CheckCircle2 />

              <span>
                Expense and transaction management
              </span>
            </div>

            <div>
              <CheckCircle2 />

              <span>
                Budgets, analytics and financial insights
              </span>
            </div>

          </div>

        </div>

        <div className="register-info-footer">
          Secure financial workspace
          <span>•</span>
          Ledgerly
        </div>

      </section>


      {/* =====================================================
          REGISTER FORM AREA
      ===================================================== */}

      <section className="register-form-area">

        <div className="register-card">

          {/* MOBILE BRAND */}

           <div className="mobile-brand">

           <div className="mobile-brand-logo">
           <img
           src="/ledgerly-30x30.png"
           alt="Ledgerly"
            />
           </div>

  <strong>
    <span>Ledgerly</span>
  </strong>

</div>


          {/* HEADING */}

          <div className="register-heading">

            <span>
              ACCOUNT SETUP
            </span>

            <h2>
              Create your account
            </h2>

            <p>
              Set up your Ledgerly bookkeeping workspace.
            </p>

          </div>


          {/* ERROR */}

          {error && (
            <div className="register-alert error">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}


          {/* SUCCESS */}

          {success && (
            <div className="register-alert success">

              <CheckCircle2 size={16} />

              <span>
                {success}
              </span>

            </div>
          )}


          {/* =================================================
              FORM
          ================================================= */}

          <form onSubmit={handleSubmit}>

            {/* =================================================
                01 PERSONAL INFORMATION
            ================================================= */}

            <div className="form-section">

              <div className="form-section-heading">

                <span>
                  01
                </span>

                <div>

                  <strong>
                    Personal information
                  </strong>

                  <small>
                    Tell us who you are
                  </small>

                </div>

              </div>


              <label htmlFor="full_name">
                Full name
              </label>

              <div className="input-wrapper">

                <User />

                <input
                  id="full_name"
                  type="text"
                  name="full_name"
                  placeholder="Enter your full name"
                  value={form.full_name}
                  onChange={handleChange}
                  autoComplete="name"
                  disabled={loading}
                />

              </div>

            </div>


            {/* =================================================
                02 BUSINESS INFORMATION
            ================================================= */}

            <div className="form-section">

              <div className="form-section-heading">

                <span>
                  02
                </span>

                <div>

                  <strong>
                    Business information
                  </strong>

                  <small>
                    Set up your bookkeeping workspace
                  </small>

                </div>

              </div>


              <label htmlFor="company_name">
                Company / business name
              </label>

              <div className="input-wrapper">

                <Building2 />

                <input
                  id="company_name"
                  type="text"
                  name="company_name"
                  placeholder="Enter your company name"
                  value={form.company_name}
                  onChange={handleChange}
                  autoComplete="organization"
                  disabled={loading}
                />

              </div>

            </div>


            {/* =================================================
                03 ACCOUNT TYPE
            ================================================= */}

            <div className="form-section">

              <div className="form-section-heading">

                <span>
                  03
                </span>

                <div>

                  <strong>
                    Account type
                  </strong>

                  <small>
                    Choose how you will use Ledgerly
                  </small>

                </div>

              </div>


              <label>
                Register as
              </label>


              <div className="role-options">

                {/* USER */}

                <button
                  type="button"
                  className={`role-option ${
                    role === "user"
                      ? "selected"
                      : ""
                  }`}
                  onClick={selectUserRole}
                  disabled={loading}
                >

                  <div className="role-icon">
                    <User />
                  </div>

                  <div className="role-info">

                    <strong>
                      User
                    </strong>

                    <span>
                      Manage your finances and bookkeeping
                    </span>

                  </div>

                  {role === "user" && (
                    <CheckCircle2 className="role-check" />
                  )}

                </button>


                {/* ADMIN */}

                <button
                  type="button"
                  className={`role-option ${
                    role === "admin"
                      ? "selected admin"
                      : ""
                  }`}
                  onClick={selectAdminRole}
                  disabled={loading}
                >

                  <div className="role-icon admin-icon">
                    <Shield />
                  </div>

                  <div className="role-info">

                    <strong>
                      Administrator
                    </strong>

                    <span>
                      Manage users, settings and the admin panel
                    </span>

                  </div>

                  {role === "admin" && (
                    <CheckCircle2 className="role-check" />
                  )}

                </button>

              </div>


              {/* ADMIN CODE */}

              {role === "admin" && (

                <div className="admin-code-box">

                  <div className="admin-code-header">

                    <ShieldCheck />

                    <div>

                      <strong>
                        Admin access verification
                      </strong>

                      <small>
                        Enter the administrator access code
                        provided by your organization.
                      </small>

                    </div>

                  </div>


                  <input
                    type="password"
                    placeholder="Enter admin access code"
                    value={adminCode}
                    onChange={(e) => {
                      setAdminCode(e.target.value);
                      setError("");
                      setSuccess("");
                    }}
                    disabled={loading}
                    autoComplete="off"
                  />

                </div>

              )}

            </div>


            {/* =================================================
                04 ACCOUNT SECURITY
            ================================================= */}

            <div className="form-section">

              <div className="form-section-heading">

                <span>
                  04
                </span>

                <div>

                  <strong>
                    Account security
                  </strong>

                  <small>
                    Protect your financial workspace
                  </small>

                </div>

              </div>


              {/* EMAIL */}

              <label htmlFor="email">
                Email address
              </label>

              <div className="input-wrapper">

                <Mail />

                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  disabled={loading}
                />

              </div>


              {/* MOBILE */}

              <label htmlFor="mobile_number">
                Mobile number
              </label>

              <div className="input-wrapper">

                <Phone />

                <input
                  id="mobile_number"
                  type="tel"
                  name="mobile_number"
                  placeholder="+91 9876543210"
                  value={form.mobile_number}
                  onChange={handleChange}
                  autoComplete="tel"
                  disabled={loading}
                />

              </div>


              {/* PASSWORD */}

              <label htmlFor="password">
                Password
              </label>

              <div className="input-wrapper">

                <LockKeyhole />

                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  name="password"
                  placeholder="Create a secure password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  disabled={loading}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  disabled={loading}
                >

                  {showPassword ? (
                    <EyeOff />
                  ) : (
                    <Eye />
                  )}

                </button>

              </div>


              {/* CONFIRM PASSWORD */}

              <label htmlFor="confirm_password">
                Confirm password
              </label>

              <div className="input-wrapper">

                <LockKeyhole />

                <input
                  id="confirm_password"
                  type={
                    showConfirm
                      ? "text"
                      : "password"
                  }
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  autoComplete="new-password"
                  disabled={loading}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowConfirm((previous) => !previous)
                  }
                  aria-label={
                    showConfirm
                      ? "Hide password"
                      : "Show password"
                  }
                  disabled={loading}
                >

                  {showConfirm ? (
                    <EyeOff />
                  ) : (
                    <Eye />
                  )}

                </button>

              </div>


              <div className="password-hint">
                Use at least 6 characters for your password.
              </div>

            </div>


            {/* =================================================
                TERMS
            ================================================= */}

            <div className="terms">

              <input
                id="terms-checkbox"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => {
                  setAcceptedTerms(e.target.checked);
                  setError("");
                  setSuccess("");
                }}
                disabled={loading}
              />

              <label htmlFor="terms-checkbox">

                I agree to{" "}

                <button
                  type="button"
                  className="terms-link"
                  onClick={() => setShowTerms(true)}
                  disabled={loading}
                >
                  Terms of Service
                </button>

                {" "}and{" "}

                <button
                  type="button"
                  className="terms-link"
                  onClick={() => setShowPrivacy(true)}
                  disabled={loading}
                >
                  Privacy Policy
                </button>

                {" "}of Ledgerly.

              </label>

            </div>


            {/* =================================================
                SUBMIT
            ================================================= */}

            <button
              type="submit"
              className="register-button"
              disabled={loading}
            >

              {loading ? (
                <>
                  <span className="register-spinner" />

                  Sending verification code...
                </>
              ) : (
                <>
                  Continue with verification

                  <ArrowRight />
                </>
              )}

            </button>

          </form>


          {/* =================================================
              LOGIN
          ================================================= */}

          <div className="login-existing">

            <span>
              Already have an account?
            </span>

            <Link to="/login">

              Sign in

              <ArrowRight />

            </Link>

          </div>


          {/* SECURITY */}

          <div className="register-security">

            Your information is securely handled by Ledgerly.

          </div>

        </div>

      </section>


      {/* =====================================================
          TERMS MODAL
      ===================================================== */}

      {showTerms && (

        <div
          className="legal-overlay"
          onClick={() => setShowTerms(false)}
        >

          <div
            className="legal-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="legal-header">

              <div className="legal-title">

                <div className="legal-icon">
                  <FileText />
                </div>

                <div>

                  <h3>
                    Terms of Service
                  </h3>

                  <span>
                    Ledgerly – Smart Bookkeeping
                  </span>

                </div>

              </div>


              <button
                type="button"
                className="legal-close"
                onClick={() => setShowTerms(false)}
              >
                <X />
              </button>

            </div>


            <div className="legal-content">

              <p className="legal-intro">
                By creating a Ledgerly account,
                you agree to use the service
                responsibly and in accordance
                with these terms.
              </p>

              <h4>1. Account Responsibility</h4>

              <p>
                You are responsible for providing
                accurate information when creating
                your account and for keeping your
                login credentials secure.
              </p>

              <h4>2. Use of Ledgerly</h4>

              <p>
                Ledgerly is designed to help you
                organize, track and understand
                financial information. You should
                use the platform only for lawful
                purposes and only with financial
                information that you are authorized
                to manage.
              </p>

              <h4>3. Financial Information</h4>

              <p>
                Ledgerly provides bookkeeping,
                reporting and financial organization
                tools. Information and insights
                provided by the platform should not
                be treated as professional accounting,
                tax, investment or legal advice.
              </p>

              <h4>4. Data Accuracy</h4>

              <p>
                You are responsible for checking
                the accuracy of transactions,
                expenses, income, budgets and
                other information entered into
                your account.
              </p>

              <h4>5. Account Security</h4>

              <p>
                Do not share your password or
                authentication credentials with
                other people.
              </p>

              <h4>6. Prohibited Activities</h4>

              <p>
                You must not attempt to disrupt
                the service, access another user's
                account, misuse the platform,
                upload malicious content or
                attempt to bypass security controls.
              </p>

              <h4>7. Service Availability</h4>

              <p>
                We aim to keep Ledgerly available
                and reliable, but temporary
                interruptions may occur because
                of maintenance, updates or
                technical issues.
              </p>

              <h4>8. Acceptance</h4>

              <p>
                By checking the agreement box
                and creating an account, you
                confirm that you have read and
                accepted these Terms of Service.
              </p>

            </div>


            <div className="legal-footer">

              <button
                type="button"
                onClick={() => setShowTerms(false)}
              >
                I understand
              </button>

            </div>

          </div>

        </div>

      )}


      {/* =====================================================
          PRIVACY MODAL
      ===================================================== */}

      {showPrivacy && (

        <div
          className="legal-overlay"
          onClick={() => setShowPrivacy(false)}
        >

          <div
            className="legal-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="legal-header">

              <div className="legal-title">

                <div className="legal-icon privacy">
                  <ShieldCheck />
                </div>

                <div>

                  <h3>
                    Privacy Policy
                  </h3>

                  <span>
                    Ledgerly – Smart Bookkeeping
                  </span>

                </div>

              </div>


              <button
                type="button"
                className="legal-close"
                onClick={() => setShowPrivacy(false)}
              >
                <X />
              </button>

            </div>


            <div className="legal-content">

              <p className="legal-intro">
                Ledgerly respects your privacy.
                This policy explains how information
                may be used when you use the
                bookkeeping platform.
              </p>

              <h4>1. Information We Collect</h4>

              <p>
                We may collect information you
                provide when creating your account,
                including your name, email address,
                mobile number and company or
                business name.
              </p>

              <h4>2. Financial Information</h4>

              <p>
                Information such as transactions,
                expenses, income, accounts and
                budgets may be stored so Ledgerly
                can provide its bookkeeping features.
              </p>

              <h4>3. How Information Is Used</h4>

              <p>
                Your information may be used to
                provide, maintain and improve
                Ledgerly features, authenticate
                your account and generate
                bookkeeping reports and insights.
              </p>

              <h4>4. Account Security</h4>

              <p>
                Ledgerly uses reasonable technical
                measures designed to protect
                account information from unauthorized
                access. However, no internet service
                can guarantee absolute security.
              </p>

              <h4>5. Your Responsibility</h4>

              <p>
                You should avoid entering information
                that you are not authorized to store
                or manage. Keep your account
                credentials private and secure.
              </p>

              <h4>6. Third-Party Services</h4>

              <p>
                Ledgerly may use third-party
                infrastructure or services to
                operate certain application features.
                Such services may process information
                only as necessary to provide the
                requested functionality.
              </p>

              <h4>7. Data Retention</h4>

              <p>
                Account and bookkeeping information
                may be retained while your account
                remains active or as required for
                legitimate operational and security
                purposes.
              </p>

              <h4>8. Policy Updates</h4>

              <p>
                This Privacy Policy may be updated
                when Ledgerly introduces new
                functionality or changes how
                information is handled.
              </p>

              <h4>9. Contact</h4>

              <p>
                If you have questions about privacy
                or your account information, contact
                the Ledgerly administrator responsible
                for your workspace.
              </p>

            </div>


            <div className="legal-footer">

              <button
                type="button"
                onClick={() => setShowPrivacy(false)}
              >
                I understand
              </button>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}
