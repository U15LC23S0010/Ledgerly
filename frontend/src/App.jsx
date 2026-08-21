import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyRegistration from "./pages/VerifyRegistration";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

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
import GuideGate from "./pages/GuideGate";
import Welcome from "./pages/Welcome";

import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";

export default function App() {
  return (
    <Routes>

      {/* =========================================
          PUBLIC ROUTES
      ========================================= */}

       <Route path="/welcome"
       element={<Welcome />} />

       <Route
       path="/"
       element={<GuideGate />}
/>
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

      {/* =========================================
          PASSWORD RECOVERY
          MUST BE PUBLIC
      ========================================= */}

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      {/* =========================================
          PROTECTED ROUTES
      ========================================= */}

      <Route element={<ProtectedRoute />}>

        <Route element={<AppLayout />}>

          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          <Route
            path="/accounts"
            element={<Accounts />}
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
            path="/analytics"
            element={<Analytics />}
          />

          <Route
            path="/auto-expense"
            element={<AutoExpense />}
          />

          <Route
            path="/budget"
            element={<Budget />}
          />

          <Route
            path="/categories"
            element={<Categories />}
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
            path="/insights"
            element={<Insights />}
          />

          <Route
            path="/reports"
            element={<Reports />}
          />

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

          <Route
            path="/start"
            element={<GuideGate />}
          />

        </Route>

      </Route>

      {/* =========================================
          UNKNOWN ROUTE
      ========================================= */}

      <Route
        path="*"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />

    </Routes>
  );
}
