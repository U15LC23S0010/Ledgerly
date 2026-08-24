import { useEffect, useState } from "react";
import {
  User,
  Building2,
  Shield,
  Mail,
  Phone,
  Lock,
  CheckCircle2,
  UserCircle,
} from "lucide-react";

import api from "../api/api";
import "./Profile.css";

/* =========================================================
   SAFE USER FROM LOCAL STORAGE
========================================================= */

function getStoredUser() {
  try {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      return null;
    }

    return JSON.parse(storedUser);
  } catch (error) {
    console.error("Unable to read stored user:", error);
    return null;
  }
}

/* =========================================================
   GET FULL NAME
========================================================= */

function getFullName(user) {
  if (!user) {
    return "Ledgerly User";
  }

  if (user.name) {
    return user.name;
  }

  const fullName = [
    user.first_name,
    user.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  if (fullName) {
    return fullName;
  }

  if (user.username) {
    return user.username;
  }

  if (user.email) {
    return user.email.split("@")[0];
  }

  return "Ledgerly User";
}

/* =========================================================
   GET INITIALS
========================================================= */

function getInitials(user) {
  const name = getFullName(user);

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join("");

  return initials || "U";
}

/* =========================================================
   GET ACCOUNT TYPE
========================================================= */

function getAccountType(user) {
  if (!user) {
    return "User";
  }

  const role =
    user.role ||
    user.user_role ||
    user.account_type ||
    user.accountType;

  if (!role) {
    return "User";
  }

  return String(role)
    .toLowerCase() === "admin"
    ? "Admin"
    : "User";
}

/* =========================================================
   GET BUSINESS NAME
========================================================= */

function getBusinessName(user) {
  if (!user) {
    return "Not provided";
  }

  return (
    user.business_name ||
    user.company_name ||
    user.company ||
    user.businessName ||
    "Not provided"
  );
}

/* =========================================================
   GET PHONE
========================================================= */

function getPhone(user) {
  if (!user) {
    return "";
  }

  return (
    user.phone ||
    user.phone_number ||
    user.mobile ||
    user.mobile_number ||
    ""
  );
}

/* =========================================================
   PROFILE
========================================================= */

export default function Profile() {
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =======================================================
     LOAD CURRENT USER
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/auth/me");

        if (cancelled) {
          return;
        }

        const currentUser =
          response.data?.user ||
          response.data;

        if (currentUser) {
          setUser(currentUser);

          localStorage.setItem(
            "user",
            JSON.stringify(currentUser)
          );
        }
      } catch (err) {
        console.error(
          "Unable to load profile:",
          err
        );

        /*
         * If the backend request fails but a user
         * already exists in localStorage, keep
         * displaying that information.
         */
        if (!user) {
          setError(
            "Unable to load your profile information."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =======================================================
     USER INFORMATION
  ======================================================= */

  const fullName = getFullName(user);

  const initials = getInitials(user);

  const businessName =
    getBusinessName(user);

  const accountType =
    getAccountType(user);

  const email =
    user?.email || "";

  const phone =
    getPhone(user);

  /*
   * Password is intentionally NEVER displayed.
   *
   * The application should never retrieve or
   * expose the user's actual password.
   */
  const passwordDisplay =
    "••••••••••••";

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="profile-page">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="profile-page-header">

        <div className="profile-page-heading">

          <div className="profile-heading-icon">
            <UserCircle size={24} />
          </div>

          <div>
            <span className="profile-eyebrow">
              ACCOUNT
            </span>

            <h1>
              Profile
            </h1>

            <p>
              View your Ledgerly account information
              and security details.
            </p>
          </div>

        </div>

      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="profile-error">
          <Shield size={18} />

          <span>
            {error}
          </span>
        </div>
      )}

      {/* =================================================
          PROFILE CONTENT
      ================================================= */}

      <div className="profile-content">

        {/* =================================================
            PERSONAL INFORMATION
        ================================================= */}

        <section className="profile-card">

          <div className="profile-card-header">

            <div className="profile-card-icon">
              <User size={20} />
            </div>

            <div>
              <h2>
                Personal Information
              </h2>

              <p>
                Your registered Ledgerly account
                information.
              </p>
            </div>

          </div>

          {/* PROFILE SUMMARY */}

          <div className="profile-summary">

            <div className="profile-avatar">
              {initials}
            </div>

            <div className="profile-summary-info">

              <h3>
                {fullName}
              </h3>

              {email && (
                <span>
                  {email}
                </span>
              )}

              <div className="profile-account-badge">
                <CheckCircle2 size={14} />

                {accountType} Account
              </div>

            </div>

          </div>

          {/* INFORMATION GRID */}

          <div className="profile-info-grid">

            {/* FULL NAME */}

            <div className="profile-info-item">

              <div className="profile-info-item-icon">
                <User size={17} />
              </div>

              <div className="profile-info-item-content">

                <span>
                  Full Name
                </span>

                <strong>
                  {fullName}
                </strong>

              </div>

            </div>

            {/* BUSINESS NAME */}

            <div className="profile-info-item">

              <div className="profile-info-item-icon">
                <Building2 size={17} />
              </div>

              <div className="profile-info-item-content">

                <span>
                  Business Name
                </span>

                <strong>
                  {businessName}
                </strong>

              </div>

            </div>

            {/* ACCOUNT TYPE */}

            <div className="profile-info-item">

              <div className="profile-info-item-icon">
                <Shield size={17} />
              </div>

              <div className="profile-info-item-content">

                <span>
                  Account Type
                </span>

                <strong>
                  {accountType}
                </strong>

              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            ACCOUNT SECURITY
        ================================================= */}

        <section className="profile-card">

          <div className="profile-card-header">

            <div className="profile-card-icon security-icon">
              <Shield size={20} />
            </div>

            <div>
              <h2>
                Account Security
              </h2>

              <p>
                Your authentication and account
                security information.
              </p>
            </div>

          </div>

          <div className="security-list">

            {/* EMAIL */}

            <div className="security-item">

              <div className="security-item-left">

                <div className="security-item-icon">
                  <Mail size={18} />
                </div>

                <div className="security-item-content">

                  <span>
                    Email Address
                  </span>

                  <strong>
                    {email || "Not provided"}
                  </strong>

                </div>

              </div>

              {email && (
                <div className="security-status">
                  <CheckCircle2 size={15} />
                  Registered
                </div>
              )}

            </div>

            {/* PHONE */}

            <div className="security-item">

              <div className="security-item-left">

                <div className="security-item-icon">
                  <Phone size={18} />
                </div>

                <div className="security-item-content">

                  <span>
                    Phone Number
                  </span>

                  <strong>
                    {phone || "Not provided"}
                  </strong>

                </div>

              </div>

            </div>

            {/* PASSWORD */}

            <div className="security-item">

              <div className="security-item-left">

                <div className="security-item-icon">
                  <Lock size={18} />
                </div>

                <div className="security-item-content">

                  <span>
                    Password
                  </span>

                  <strong className="password-value">
                    {passwordDisplay}
                  </strong>

                </div>

              </div>

              <div className="security-status password-status">
                Protected
              </div>

            </div>

          </div>

          {/* PASSWORD NOTE */}

          <div className="security-note">

            <Lock size={17} />

            <div>

              <strong>
                Password protected
              </strong>

              <span>
                Your actual password is never
                displayed or retrieved by the
                profile page.
              </span>

            </div>

          </div>

        </section>

        {/* =================================================
            ACCOUNT STATUS
        ================================================= */}

        <section className="profile-card account-status-card">

          <div className="profile-card-header">

            <div className="profile-card-icon">
              <CheckCircle2 size={20} />
            </div>

            <div>
              <h2>
                Account Status
              </h2>

              <p>
                Current status of your Ledgerly
                account.
              </p>
            </div>

          </div>

          <div className="account-status">

            <div className="account-status-indicator">
              <CheckCircle2 size={20} />
            </div>

            <div>

              <strong>
                Account Active
              </strong>

              <span>
                Your Ledgerly account is currently
                active and authenticated.
              </span>

            </div>

          </div>

        </section>

      </div>

      {/* =================================================
          LOADING
      ================================================= */}

      {loading && (
        <div className="profile-loading">
          Loading profile information...
        </div>
      )}

    </div>
  );
}