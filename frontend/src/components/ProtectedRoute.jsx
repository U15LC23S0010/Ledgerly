import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

import api from "../api/api";
import "./ProtectedRoute.css";

export default function ProtectedRoute() {
  const location = useLocation();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAuthentication() {
      try {
        const accessToken =
          localStorage.getItem("access") ||
          localStorage.getItem("token");

        // -----------------------------------------
        // NO TOKEN
        // -----------------------------------------

        if (!accessToken) {
          if (mounted) {
            setAuthenticated(false);
            setCheckingAuth(false);
          }

          return;
        }

        // -----------------------------------------
        // VERIFY TOKEN WITH BACKEND
        // -----------------------------------------

        const response = await api.get("/auth/me");

        /*
         * Your backend returns:
         *
         * {
         *   message: "Welcome!",
         *   user: {...}
         * }
         */

        const currentUser = response.data?.user;

        if (!currentUser) {
          throw new Error("Invalid user response");
        }

        // -----------------------------------------
        // SAVE USER
        // -----------------------------------------

        localStorage.setItem(
          "user",
          JSON.stringify(currentUser)
        );

        if (mounted) {
          setAuthenticated(true);
        }
      } catch (error) {
        console.error(
          "Authentication check failed:",
          error
        );

        // -----------------------------------------
        // INVALID / EXPIRED TOKEN
        // -----------------------------------------

        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        if (mounted) {
          setAuthenticated(false);
        }
      } finally {
        if (mounted) {
          setCheckingAuth(false);
        }
      }
    }

    checkAuthentication();

    return () => {
      mounted = false;
    };
  }, []);

  // -----------------------------------------
  // CHECKING AUTH
  // -----------------------------------------

  if (checkingAuth) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-card">

          <div className="auth-loading-logo">
            L
          </div>

          <div className="auth-loading-spinner" />

          <h2>Ledgerly</h2>

          <p>
            Checking your account...
          </p>

        </div>
      </div>
    );
  }

  // -----------------------------------------
  // NOT AUTHENTICATED
  // -----------------------------------------

  if (!authenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname
        }}
      />
    );
  }

  // -----------------------------------------
  // AUTHENTICATED
  // -----------------------------------------

  return <Outlet />;
}