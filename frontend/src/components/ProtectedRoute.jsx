import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

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
          localStorage.getItem("access_token") ||
          localStorage.getItem("access") ||
          localStorage.getItem("token");

        if (!accessToken) {

          if (mounted) {
            setAuthenticated(false);
            setCheckingAuth(false);
          }

          return;
        }

        const response = await api.get("/auth/me");

        const currentUser =
          response.data?.user;

        if (!currentUser) {
          throw new Error(
            "Invalid user response"
          );
        }

        localStorage.setItem(
          "user",
          JSON.stringify(currentUser)
        );

        if (mounted) {
          setAuthenticated(true);
          setCheckingAuth(false);
        }

      } catch (error) {

        console.error(
          "Authentication check failed:",
          error
        );

        localStorage.removeItem("access");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("userEmail");

        if (mounted) {
          setAuthenticated(false);
          setCheckingAuth(false);
        }

      }
    }

    checkAuthentication();

    return () => {
      mounted = false;
    };

  }, []);

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

  if (!authenticated) {

    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  return <Outlet />;
}