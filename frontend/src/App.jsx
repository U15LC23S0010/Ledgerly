
import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyRegistration from "./pages/VerifyRegistration";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import Welcome from "./pages/Welcome";

import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import Analytics from "./pages/Analytics";
import AutoExpense from "./pages/AutoExpense";
import Budget from "./pages/Budget";
import Categories from "./pages/Categories";
import Customers from "./pages/Customers";
import Expenses from "./pages/Expenses";
import Insights from "./pages/Insights";
import Vendors from "./pages/Vendors";
import Invoices from "./pages/Invoices";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Transactions from "./pages/Transactions";
import Notifications from "./pages/Notifications";
import Guide from "./pages/Guide";

import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";


/* =========================================================
   SETTINGS
========================================================= */

const SETTINGS_KEY = "ledgerly_settings";


/* =========================================================
   DEFAULT WORKSPACE REDIRECT
========================================================= */

function WorkspaceDefaultRedirect() {
  let destination = "/dashboard";

  try {
    const storedSettings =
      localStorage.getItem(SETTINGS_KEY);

    if (storedSettings) {
      const settings =
        JSON.parse(storedSettings);

      switch (settings.dashboardView) {
        case "expenses":
          destination = "/expenses";
          break;

        case "analytics":
          destination = "/analytics";
          break;

        case "overview":
        default:
          destination = "/dashboard";
          break;
      }
    }
  } catch (error) {
    console.error(
      "Unable to read dashboard preference:",
      error
    );

    destination = "/dashboard";
  }

  return (
    <Navigate
      to={destination}
      replace
    />
  );
}


/* =========================================================
   APPLICATION
========================================================= */

export default function App() {
  return (
    <Routes>

      {/* =====================================================
          PUBLIC AUTHENTICATION ROUTES
      ===================================================== */}

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/verify-registration"
        element={<VerifyRegistration />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />


      {/* =====================================================
          WELCOME ROUTE

          IMPORTANT:
          - NOT inside ProtectedRoute
          - NOT inside AppLayout
          - No sidebar
          - No dashboard
          - Login redirects here after successful login
      ===================================================== */}

      <Route
        path="/welcome"
        element={<Welcome />}
      />


      {/* =====================================================
          PROTECTED APPLICATION
      ===================================================== */}

      <Route element={<ProtectedRoute />}>

        {/* ===================================================
            APPLICATION LAYOUT
        =================================================== */}

        <Route element={<AppLayout />}>

          {/* =================================================
              ROOT
          ================================================= */}

          <Route
            path="/"
            element={<WorkspaceDefaultRedirect />}
          />


          {/* =================================================
              DASHBOARD
          ================================================= */}

          <Route
            path="/dashboard"
            element={<Dashboard />}
          />


          {/* =================================================
              WORKSPACE
          ================================================= */}

          <Route
            path="/workspace"
            element={<WorkspaceDefaultRedirect />}
          />

          <Route
            path="/transactions"
            element={<Transactions />}
          />

          <Route
            path="/expenses"
            element={<Expenses />}
          />

          <Route
            path="/auto-expense"
            element={<AutoExpense />}
          />

          <Route
            path="/categories"
            element={<Categories />}
          />

          <Route
            path="/budget"
            element={<Budget />}
          />


          {/* =================================================
              ANALYZE
          ================================================= */}

          <Route
            path="/analytics"
            element={<Analytics />}
          />

          <Route
            path="/insights"
            element={<Insights />}
          />


          {/* =================================================
              BUSINESS
          ================================================= */}

          <Route
            path="/accounts"
            element={<Accounts />}
          />

          <Route
            path="/customers"
            element={<Customers />}
          />

          <Route
            path="/vendors"
            element={<Vendors />}
          />

          <Route
            path="/invoices"
            element={<Invoices />}
          />

          <Route
            path="/reports"
            element={<Reports />}
          />


          {/* =================================================
              SETTINGS
          ================================================= */}

          <Route
            path="/settings"
            element={<Settings />}
          />

          <Route
            path="/notifications"
            element={<Notifications />}
          />

          <Route
            path="/guide"
            element={<Guide />}
          />


          {/* =================================================
              START
          ================================================= */}

          <Route
            path="/start"
            element={<WorkspaceDefaultRedirect />}
          />

        </Route>

      </Route>


      {/* =====================================================
          UNKNOWN ROUTES
      ===================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

    </Routes>
  );
}
