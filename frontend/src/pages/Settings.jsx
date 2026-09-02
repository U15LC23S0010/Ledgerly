import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  Settings as SettingsIcon,
  Building2,
  Palette,
  SlidersHorizontal,
  Database,
  Info,
  Save,
  RotateCcw,
  Download,
  BookOpen,
  LogOut,
  Moon,
  Sun,
  Monitor,
  Check,
  LayoutDashboard,
  CalendarDays,
  CircleDollarSign,
  Trash2,
  HelpCircle,
  Sparkles,
} from "lucide-react";

import "./Settings.css";

const SETTINGS_KEY = "ledgerly_settings";
const CURRENCY_KEY = "ledgerly_currency";
const DATE_FORMAT_KEY = "ledgerly_date_format";

const DEFAULT_SETTINGS = {
  businessName: "",
  currency: "INR",
  dateFormat: "DD/MM/YYYY",
  appearance: "light",
  layoutDensity: "comfortable",

  dashboardView: "overview",

  showFinancialSummary: true,
  confirmDelete: true,
};

/* =========================================================
   DASHBOARD ROUTES
========================================================= */

const DASHBOARD_VIEW_ROUTES = {
  overview: "/dashboard",
  expenses: "/expenses",
  analytics: "/analytics",
};

/* =========================================================
   VALID VALUES
========================================================= */

const VALID_CURRENCIES = [
  "INR",
  "USD",
  "EUR",
  "GBP",
];

const VALID_DATE_FORMATS = [
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
];

/* =========================================================
   GET REGISTERED USER
========================================================= */

function getStoredUser() {
  try {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      return null;
    }

    const parsedUser = JSON.parse(storedUser);

    if (!parsedUser || typeof parsedUser !== "object") {
      return null;
    }


    return parsedUser;
  } catch (error) {
    console.error(
      "Unable to read stored user:",
      error
    );

    return null;
  }
}

/* =========================================================
   GET REGISTERED BUSINESS NAME
========================================================= */

function getRegisteredBusinessName(user) {
  if (!user) {
    return "";
  }

  const possibleBusinessNames = [
    user.business_name,
    user.businessName,
    user.company_name,
    user.companyName,
    user.company,
    user.business,
  ];

  const businessName =
    possibleBusinessNames.find(
      (value) =>
        typeof value === "string" &&
        value.trim().length > 0
    );

  return businessName
    ? businessName.trim()
    : "";
}

function getUserName(user) {
  if (!user) {
    return "";
  }

  if (
    typeof user.name === "string" &&
    user.name.trim()
  ) {
    return user.name.trim();
  }

  const fullName = [
    user.first_name,
    user.last_name,
  ]
    .filter(
      (value) =>
        typeof value === "string" &&
        value.trim()
    )
    .join(" ")
    .trim();

  if (fullName) {
    return fullName;
  }

  if (
    typeof user.username === "string" &&
    user.username.trim()
  ) {
    return user.username.trim();
  }

  return "";
}

/* =========================================================
   NORMALIZE SETTINGS
========================================================= */

function normalizeSettings(
  settings = {},
  registeredBusinessName = ""
) {
  const currency = VALID_CURRENCIES.includes(
    settings.currency
  )
    ? settings.currency
    : DEFAULT_SETTINGS.currency;

  const dashboardView =
    DASHBOARD_VIEW_ROUTES[
      settings.dashboardView
    ]
      ? settings.dashboardView
      : DEFAULT_SETTINGS.dashboardView;

  const dateFormat = VALID_DATE_FORMATS.includes(
    settings.dateFormat
  )
    ? settings.dateFormat
    : DEFAULT_SETTINGS.dateFormat;

  const existingBusinessName =
    typeof settings.businessName === "string"
      ? settings.businessName.trim()
      : "";

  const businessName =
    registeredBusinessName ||
    existingBusinessName ||
    "";

  return {
    ...DEFAULT_SETTINGS,
    ...settings,

    businessName,

    currency,
    dashboardView,
    dateFormat,
  };
}

/* =========================================================
   SETTINGS PAGE
========================================================= */

export default function Settings() {
  const [settings, setSettings] = useState(
    DEFAULT_SETTINGS
  );

  const [saved, setSaved] = useState(false);

  /* =======================================================
     LOAD SETTINGS + REGISTERED BUSINESS NAME
  ======================================================= */

  useEffect(() => {
    const storedUser = getStoredUser();

    const registeredBusinessName =
      getRegisteredBusinessName(
        storedUser
      );

    const storedSettings =
      localStorage.getItem(SETTINGS_KEY);

    let loadedSettings = {
      ...DEFAULT_SETTINGS,
      businessName:
        registeredBusinessName,
    };

    /* -------------------------------------------------------
       LOAD EXISTING SETTINGS
    ------------------------------------------------------- */

    if (storedSettings) {
      try {
        const parsedSettings =
          JSON.parse(storedSettings);

        loadedSettings =
          normalizeSettings(
            parsedSettings,
            registeredBusinessName
          );
      } catch (error) {
        console.error(
          "Unable to load settings:",
          error
        );

        loadedSettings =
          normalizeSettings(
            DEFAULT_SETTINGS,
            registeredBusinessName
          );
      }
    }

    /* -------------------------------------------------------
       LEGACY DATE FORMAT
    ------------------------------------------------------- */

    const storedDateFormat =
      localStorage.getItem(
        DATE_FORMAT_KEY
      );

    if (
      storedDateFormat &&
      VALID_DATE_FORMATS.includes(
        storedDateFormat
      )
    ) {
      loadedSettings = {
        ...loadedSettings,
        dateFormat: storedDateFormat,
      };
    }

    if (registeredBusinessName) {
      loadedSettings = {
        ...loadedSettings,
        businessName:
          registeredBusinessName,
      };
    }

    setSettings(loadedSettings);
  }, []);

  useEffect(() => {
    const root =
      document.documentElement;


    let theme =
      settings.appearance;

    if (
      settings.appearance ===
      "system"
    ) {
      const prefersDark =
        window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;

      theme = prefersDark
        ? "dark"
        : "light";
    }

    root.setAttribute(
      "data-theme",
      theme
    );

    localStorage.setItem(
      "ledgerflow_theme",
      theme
    );

    /* -------------------------------------------------------
       DENSITY
    ------------------------------------------------------- */

    root.setAttribute(
      "data-density",
      settings.layoutDensity
    );

    /* -------------------------------------------------------
       CURRENCY
    ------------------------------------------------------- */

    root.setAttribute(
      "data-currency",
      settings.currency
    );

    localStorage.setItem(
      CURRENCY_KEY,
      settings.currency
    );

    /* -------------------------------------------------------
       DATE FORMAT
    ------------------------------------------------------- */

    root.setAttribute(
      "data-date-format",
      settings.dateFormat
    );

    localStorage.setItem(
      DATE_FORMAT_KEY,
      settings.dateFormat
    );

    /* -------------------------------------------------------
       SETTINGS EVENT
    ------------------------------------------------------- */

    window.dispatchEvent(
      new CustomEvent(
        "ledgerly-settings-updated",
        {
          detail: {
            ...settings,
          },
        }
      )
    );

    /* -------------------------------------------------------
       CURRENCY EVENT
    ------------------------------------------------------- */

    window.dispatchEvent(
      new CustomEvent(
        "ledgerly-currency-changed",
        {
          detail:
            settings.currency,
        }
      )
    );

    /* -------------------------------------------------------
       DATE EVENT
    ------------------------------------------------------- */

    window.dispatchEvent(
      new CustomEvent(
        "ledgerly-date-format-changed",
        {
          detail:
            settings.dateFormat,
        }
      )
    );
  }, [settings]);

  /* =======================================================
     SYSTEM THEME LISTENER
  ======================================================= */

  useEffect(() => {
    if (
      settings.appearance !==
      "system"
    ) {
      return;
    }

    const mediaQuery =
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      );

    const handleThemeChange = (
      event
    ) => {
      document.documentElement.setAttribute(
        "data-theme",
        event.matches
          ? "dark"
          : "light"
      );
    };

    mediaQuery.addEventListener(
      "change",
      handleThemeChange
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        handleThemeChange
      );
    };
  }, [settings.appearance]);

  /* =======================================================
     HANDLE SETTING CHANGE
  ======================================================= */

  function handleChange(
    field,
    value
  ) {
    setSettings((previous) => ({
      ...previous,
      [field]: value,
    }));

    setSaved(false);
  }

  /* =======================================================
     SAVE SETTINGS
  ======================================================= */

  function saveSettings(event) {
    if (event) {
      event.preventDefault();
    }

    const currentUser =
      getStoredUser();

    const registeredBusinessName =
      getRegisteredBusinessName(
        currentUser
      );

    const normalizedSettings =
      normalizeSettings(
        settings,
        registeredBusinessName
      );

    setSettings(
      normalizedSettings
    );

    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify(
        normalizedSettings
      )
    );

    localStorage.setItem(
      CURRENCY_KEY,
      normalizedSettings.currency
    );

    localStorage.setItem(
      DATE_FORMAT_KEY,
      normalizedSettings.dateFormat
    );

    document.documentElement.setAttribute(
      "data-currency",
      normalizedSettings.currency
    );

    document.documentElement.setAttribute(
      "data-date-format",
      normalizedSettings.dateFormat
    );

    window.dispatchEvent(
      new CustomEvent(
        "ledgerly-settings-updated",
        {
          detail:
            normalizedSettings,
        }
      )
    );

    window.dispatchEvent(
      new CustomEvent(
        "ledgerly-currency-changed",
        {
          detail:
            normalizedSettings.currency,
        }
      )
    );

    window.dispatchEvent(
      new CustomEvent(
        "ledgerly-date-format-changed",
        {
          detail:
            normalizedSettings.dateFormat,
        }
      )
    );

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 3000);
  }

  /* =======================================================
     RESET SETTINGS
  ======================================================= */

  function resetSettings() {
    const confirmed =
      window.confirm(
        "Reset all Ledgerly settings to their default values?"
      );

    if (!confirmed) {
      return;
    }

    const currentUser =
      getStoredUser();

    const registeredBusinessName =
      getRegisteredBusinessName(
        currentUser
      );

    const reset = {
      ...DEFAULT_SETTINGS,
      businessName:
        registeredBusinessName,
    };

    setSettings(reset);

    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify(reset)
    );

    localStorage.setItem(
      CURRENCY_KEY,
      reset.currency
    );

    localStorage.setItem(
      DATE_FORMAT_KEY,
      reset.dateFormat
    );

    document.documentElement.setAttribute(
      "data-theme",
      "light"
    );

    document.documentElement.setAttribute(
      "data-density",
      "comfortable"
    );

    document.documentElement.setAttribute(
      "data-currency",
      "INR"
    );

    document.documentElement.setAttribute(
      "data-date-format",
      "DD/MM/YYYY"
    );

    window.dispatchEvent(
      new CustomEvent(
        "ledgerly-settings-updated",
        {
          detail: reset,
        }
      )
    );

    window.dispatchEvent(
      new CustomEvent(
        "ledgerly-currency-changed",
        {
          detail: "INR",
        }
      )
    );

    window.dispatchEvent(
      new CustomEvent(
        "ledgerly-date-format-changed",
        {
          detail: "DD/MM/YYYY",
        }
      )
    );

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 3000);
  }

  /* =======================================================
     CLEAR PREFERENCES
  ======================================================= */

  function clearPreferences() {
    const confirmed =
      window.confirm(
        "Clear your saved Ledgerly preferences?"
      );

    if (!confirmed) {
      return;
    }

    localStorage.removeItem(
      SETTINGS_KEY
    );

    localStorage.removeItem(
      CURRENCY_KEY
    );

    localStorage.removeItem(
      DATE_FORMAT_KEY
    );

    const currentUser =
      getStoredUser();

    const registeredBusinessName =
      getRegisteredBusinessName(
        currentUser
      );

    const clearedSettings = {
      ...DEFAULT_SETTINGS,
      businessName:
        registeredBusinessName,
    };

    setSettings(
      clearedSettings
    );

    document.documentElement.setAttribute(
      "data-theme",
      "light"
    );

    document.documentElement.setAttribute(
      "data-density",
      "comfortable"
    );

    document.documentElement.setAttribute(
      "data-currency",
      "INR"
    );

    document.documentElement.setAttribute(
      "data-date-format",
      "DD/MM/YYYY"
    );

    window.dispatchEvent(
      new CustomEvent(
        "ledgerly-settings-updated",
        {
          detail:
            clearedSettings,
        }
      )
    );

    window.dispatchEvent(
      new CustomEvent(
        "ledgerly-currency-changed",
        {
          detail: "INR",
        }
      )
    );

    window.dispatchEvent(
      new CustomEvent(
        "ledgerly-date-format-changed",
        {
          detail: "DD/MM/YYYY",
        }
      )
    );

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 3000);
  }

  /* =======================================================
     EXPORT SETTINGS
  ======================================================= */

  function exportSettings() {
    const normalizedSettings =
      normalizeSettings(
        settings,
        getRegisteredBusinessName(
          getStoredUser()
        )
      );

    const data = {
      application: "Ledgerly",
      version: "1.0.0",
      exportedAt:
        new Date().toISOString(),
      settings:
        normalizedSettings,
    };

    const blob = new Blob(
      [
        JSON.stringify(
          data,
          null,
          2
        ),
      ],
      {
        type: "application/json",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      "ledgerly-settings.json";

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(url);
  }

  /* =======================================================
     LOGOUT
  ======================================================= */

  function logout() {
    const confirmed =
      window.confirm(
        "Are you sure you want to log out?"
      );

    if (!confirmed) {
      return;
    }

    localStorage.removeItem(
      "access"
    );

    localStorage.removeItem(
      "access_token"
    );

    localStorage.removeItem(
      "refresh"
    );

    localStorage.removeItem(
      "refresh_token"
    );

    localStorage.removeItem(
      "token"
    );

    localStorage.removeItem(
      "user"
    );

    localStorage.removeItem(
      "userEmail"
    );

    sessionStorage.clear();

    window.location.href =
      "/login";
  }

  /* =======================================================
     DISPLAY VALUES
  ======================================================= */

  const displayBusinessName =
    settings.businessName ||
    "Your Business";

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="settings-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="settings-header">

        <div className="settings-heading">

          <div className="settings-icon">
            <SettingsIcon />
          </div>

          <div>

            <span className="settings-eyebrow">
              WORKSPACE
            </span>

            <h1>
              Settings
            </h1>

            <p>
              Manage your Ledgerly
              workspace and preferences.
            </p>

          </div>

        </div>

        <button
          type="button"
          className="settings-save-top"
          onClick={saveSettings}
        >
          <Save size={17} />
          Save changes
        </button>

      </div>

      {/* =================================================
          SUCCESS MESSAGE
      ================================================= */}

      {saved && (
        <div className="settings-success">

          <Check size={18} />

          <span>
            Settings saved successfully.
          </span>

        </div>
      )}

      {/* =================================================
          SETTINGS FORM
      ================================================= */}

      <form
        className="settings-layout"
        onSubmit={saveSettings}
      >

        {/* =================================================
            GENERAL
        ================================================= */}

        <section className="settings-panel">

          <div className="settings-panel-header">

            <div className="settings-panel-icon">
              <Building2 />
            </div>

            <div>

              <h2>
                General
              </h2>

              <p>
                Configure your bookkeeping
                workspace information.
              </p>

            </div>

          </div>

          <div className="settings-form">

            {/* BUSINESS NAME */}

            <div className="settings-field">

              <label htmlFor="businessName">
                Business name
              </label>

              <div className="settings-input-icon">

                <Building2 size={17} />

                <input
                  id="businessName"
                  type="text"
                  value={
                    displayBusinessName ===
                    "Your Business"
                      ? ""
                      : settings.businessName
                  }
                  onChange={(e) =>
                    handleChange(
                      "businessName",
                      e.target.value
                    )
                  }
                  placeholder="Enter business name"
                />

              </div>

              <small>
                Your registered business name
                is used by default.
              </small>

            </div>

            {/* CURRENCY */}

            <div className="settings-field">

              <label htmlFor="currency">
                Default currency
              </label>

              <div className="settings-input-icon">

                <CircleDollarSign
                  size={17}
                />

                <select
                  id="currency"
                  value={
                    settings.currency
                  }
                  onChange={(e) =>
                    handleChange(
                      "currency",
                      e.target.value
                    )
                  }
                >

                  <option value="INR">
                    INR — Indian Rupee
                  </option>

                  <option value="USD">
                    USD — US Dollar
                  </option>

                  <option value="EUR">
                    EUR — Euro
                  </option>

                  <option value="GBP">
                    GBP — British Pound
                  </option>

                </select>

              </div>

              <small>
                Used when displaying financial
                amounts throughout Ledgerly.
              </small>

            </div>

            {/* DATE FORMAT */}

            <div className="settings-field">

              <label htmlFor="dateFormat">
                Date format
              </label>

              <div className="settings-input-icon">

                <CalendarDays
                  size={17}
                />

                <select
                  id="dateFormat"
                  value={
                    settings.dateFormat
                  }
                  onChange={(e) =>
                    handleChange(
                      "dateFormat",
                      e.target.value
                    )
                  }
                >

                  <option value="DD/MM/YYYY">
                    DD/MM/YYYY
                  </option>

                  <option value="MM/DD/YYYY">
                    MM/DD/YYYY
                  </option>

                  <option value="YYYY-MM-DD">
                    YYYY-MM-DD
                  </option>

                </select>

              </div>

              <small>
                Choose how dates are displayed
                throughout Ledgerly.
              </small>

            </div>

          </div>

        </section>

        {/* =================================================
            APPEARANCE
        ================================================= */}

        <section className="settings-panel">

          <div className="settings-panel-header">

            <div className="settings-panel-icon">
              <Palette />
            </div>

            <div>

              <h2>
                Appearance
              </h2>

              <p>
                Customize how Ledgerly
                appears across the application.
              </p>

            </div>

          </div>

          <div className="settings-choice-section">

            <div className="settings-choice-title">
              Theme
            </div>

            <div className="settings-choice-grid">

              {/* LIGHT */}

              <button
                type="button"
                className={`settings-choice ${
                  settings.appearance ===
                  "light"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleChange(
                    "appearance",
                    "light"
                  )
                }
              >

                <Sun />

                <span>

                  <strong>
                    Light
                  </strong>

                  <small>
                    Clean and bright
                  </small>

                </span>

                {settings.appearance ===
                  "light" && (
                  <Check
                    className="choice-check"
                    size={18}
                  />
                )}

              </button>

              {/* DARK */}

              <button
                type="button"
                className={`settings-choice ${
                  settings.appearance ===
                  "dark"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleChange(
                    "appearance",
                    "dark"
                  )
                }
              >

                <Moon />

                <span>

                  <strong>
                    Dark
                  </strong>

                  <small>
                    Comfortable in low light
                  </small>

                </span>

                {settings.appearance ===
                  "dark" && (
                  <Check
                    className="choice-check"
                    size={18}
                  />
                )}

              </button>

              {/* SYSTEM */}

              <button
                type="button"
                className={`settings-choice ${
                  settings.appearance ===
                  "system"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleChange(
                    "appearance",
                    "system"
                  )
                }
              >

                <Monitor />

                <span>

                  <strong>
                    System
                  </strong>

                  <small>
                    Follow device preference
                  </small>

                </span>

                {settings.appearance ===
                  "system" && (
                  <Check
                    className="choice-check"
                    size={18}
                  />
                )}

              </button>

            </div>

            {/* DENSITY */}

            <div className="settings-density">

              <label htmlFor="layoutDensity">
                Layout density
              </label>

              <select
                id="layoutDensity"
                value={
                  settings.layoutDensity
                }
                onChange={(e) =>
                  handleChange(
                    "layoutDensity",
                    e.target.value
                  )
                }
              >

                <option value="comfortable">
                  Comfortable
                </option>

                <option value="compact">
                  Compact
                </option>

              </select>

            </div>

          </div>

        </section>

        {/* =================================================
            WORKSPACE PREFERENCES
        ================================================= */}

        <section className="settings-panel">

          <div className="settings-panel-header">

            <div className="settings-panel-icon">
              <SlidersHorizontal />
            </div>

            <div>

              <h2>
                Workspace Preferences
              </h2>

              <p>
                Control how your bookkeeping
                workspace behaves.
              </p>

            </div>

          </div>

          <div className="settings-options">

            {/* DASHBOARD VIEW */}

            <div className="settings-option">

              <div className="settings-option-info">

                <div className="option-title">

                  <LayoutDashboard
                    size={17}
                  />

                  <strong>
                    Dashboard view
                  </strong>

                </div>

                <span>
                  Choose the default dashboard
                  section.
                </span>

              </div>

              <select
                value={
                  DASHBOARD_VIEW_ROUTES[
                    settings.dashboardView
                  ]
                    ? settings.dashboardView
                    : "overview"
                }
                onChange={(e) =>
                  handleChange(
                    "dashboardView",
                    e.target.value
                  )
                }
              >

                <option value="overview">
                  Overview
                </option>

                <option value="expenses">
                  Expenses
                </option>

                <option value="analytics">
                  Analytics
                </option>

              </select>

            </div>

            {/* FINANCIAL SUMMARY */}

            <label className="settings-option">

              <div className="settings-option-info">

                <div className="option-title">

                  <CircleDollarSign
                    size={17}
                  />

                  <strong>
                    Financial summary
                  </strong>

                </div>

                <span>
                  Show financial summary
                  information on the dashboard.
                </span>

              </div>

              <input
                type="checkbox"
                className="settings-toggle"
                checked={
                  settings.showFinancialSummary
                }
                onChange={(e) =>
                  handleChange(
                    "showFinancialSummary",
                    e.target.checked
                  )
                }
              />

            </label>

            {/* DELETE CONFIRMATION */}

            <label className="settings-option">

              <div className="settings-option-info">

                <div className="option-title">

                  <Trash2 size={17} />

                  <strong>
                    Confirm before deleting
                  </strong>

                </div>

                <span>
                  Ask for confirmation before
                  deleting bookkeeping data.
                </span>

              </div>

              <input
                type="checkbox"
                className="settings-toggle"
                checked={
                  settings.confirmDelete
                }
                onChange={(e) =>
                  handleChange(
                    "confirmDelete",
                    e.target.checked
                  )
                }
              />

            </label>

          </div>

        </section>

        {/* =================================================
            DATA & PREFERENCES
        ================================================= */}

        <section className="settings-panel">

          <div className="settings-panel-header">

            <div className="settings-panel-icon">
              <Database />
            </div>

            <div>

              <h2>
                Data & Preferences
              </h2>

              <p>
                Manage your local application
                preferences.
              </p>

            </div>

          </div>

          <div className="settings-data-actions">

            <button
              type="button"
              className="settings-secondary-button"
              onClick={exportSettings}
            >

              <Download size={17} />

              Export settings

            </button>

            <button
              type="button"
              className="settings-secondary-button"
              onClick={clearPreferences}
            >

              <RotateCcw size={17} />

              Clear preferences

            </button>

            <button
              type="button"
              className="settings-danger-button"
              onClick={resetSettings}
            >

              <RotateCcw size={17} />

              Reset settings

            </button>

          </div>

        </section>

        {/* =================================================
            HELP & USER GUIDE
        ================================================= */}

        <section className="settings-panel">

          <div className="settings-panel-header">

            <div className="settings-panel-icon">
              <HelpCircle />
            </div>

            <div>

              <h2>
                Help & User Guide
              </h2>

              <p>
                Learn how to use Ledgerly
                and its bookkeeping features.
              </p>

            </div>

          </div>

          <Link
            to="/guide"
            className="settings-help-box"
          >

            <div className="settings-help-icon">
              <BookOpen />
            </div>

            <div>

              <strong>
                Open User Guide
              </strong>

              <span>
                Learn how to manage expenses,
                budgets, transactions, analytics
                and other bookkeeping features.
              </span>

            </div>

          </Link>

          <Link
            to="/insights"
            className="settings-help-box"
          >

            <div className="settings-help-icon">
              <Sparkles />
            </div>

            <div>

              <strong>
                AI Insights
              </strong>

              <span>
                View intelligent financial insights
                generated from your bookkeeping
                activity.
              </span>

            </div>

          </Link>

        </section>

        {/* =================================================
            ABOUT LEDGERLY
        ================================================= */}

        <section className="settings-panel">

          <div className="settings-panel-header">

            <div className="settings-panel-icon">
              <Info />
            </div>

            <div>

              <h2>
                About Ledgerly
              </h2>

              <p>
                Application information.
              </p>

            </div>

          </div>

          <div className="settings-about">

            <div className="settings-about-row">

              <span>
                Application
              </span>

              <strong>
                Ledgerly
              </strong>

            </div>

            <div className="settings-about-row">

              <span>
                Version
              </span>

              <strong>
                1.0.0
              </strong>

            </div>

            <div className="settings-about-row">

              <span>
                Purpose
              </span>

              <strong>
                Bookkeeping & Financial Management
              </strong>

            </div>

            <div className="settings-about-row">

              <span>
                Business
              </span>

              <strong>
                {displayBusinessName}
              </strong>

            </div>

            <div className="settings-about-row">

              <span>
                Currency
              </span>

              <strong>
                {settings.currency}
              </strong>

            </div>

            <div className="settings-about-row">

              <span>
                Date format
              </span>

              <strong>
                {settings.dateFormat}
              </strong>

            </div>

            <div className="settings-about-row">

              <span>
                Theme
              </span>

              <strong>
                {settings.appearance
                  .charAt(0)
                  .toUpperCase() +
                  settings.appearance.slice(1)}
              </strong>

            </div>

            <div className="settings-about-row">

              <span>
                Layout
              </span>

              <strong>
                {settings.layoutDensity
                  .charAt(0)
                  .toUpperCase() +
                  settings.layoutDensity.slice(1)}
              </strong>

            </div>

          </div>

        </section>

        {/* =================================================
            SAVE / RESET
        ================================================= */}

        <div className="settings-actions">

          <button
            type="button"
            className="settings-reset-button"
            onClick={resetSettings}
          >

            <RotateCcw size={17} />

            Reset

          </button>

          <button
            type="submit"
            className="settings-save-button"
          >

            <Save size={17} />

            Save changes

          </button>

        </div>

        {/* =================================================
            LOGOUT
        ================================================= */}

        <div className="settings-logout-section">

          <button
            type="button"
            className="settings-danger-button logout-button"
            onClick={logout}
          >

            <LogOut size={17} />

            Log out

          </button>

        </div>

      </form>

    </div>
  );
}