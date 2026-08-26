import {
  lazy,
  Suspense,
} from "react";

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

import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";

/* =========================================================
   LAZY LOAD PROTECTED PAGES
========================================================= */

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Accounts = lazy(() => import("./pages/Accounts"));
const Analytics = lazy(() => import("./pages/Analytics"));
const AutoExpense = lazy(() => import("./pages/AutoExpense"));
const Budget = lazy(() => import("./pages/Budget"));
const Categories = lazy(() => import("./pages/Categories"));
const Customers = lazy(() => import("./pages/Customers"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Insights = lazy(() => import("./pages/Insights"));
const Vendors = lazy(() => import("./pages/Vendors"));
const Invoices = lazy(() => import("./pages/Invoices"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Guide = lazy(() => import("./pages/Guide"));
const Profile = lazy(() => import("./pages/Profile"));


const SETTINGS_KEY = "ledgerly_settings";

function PageLoader() {
  return (
    <div className="page-loader">

      <div className="page-loader-spinner" />

    </div>
  );
}

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


export default function App() {

  return (

    <Suspense fallback={<PageLoader />}>

      <Routes>

        <Route
          path="/"
          element={
            <Navigate
              to="/welcome"
              replace
            />
          }
        />

        <Route
          path="/welcome"
          element={<Welcome />}
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

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />


        <Route element={<ProtectedRoute />}>

          <Route element={<AppLayout />}>

        

            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

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

            <Route
              path="/analytics"
              element={<Analytics />}
            />

            <Route
              path="/insights"
              element={<Insights />}
            />



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

            <Route
              path="/settings"
              element={<Settings />}
            />

            <Route
              path="/profile"
              element={<Profile />}
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
              element={<WorkspaceDefaultRedirect />}
            />

          </Route>

        </Route>

        
        <Route
          path="*"
          element={
            <Navigate
              to="/welcome"
              replace
            />
          }
        />

      </Routes>

    </Suspense>

  );
}