import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import "./ProtectedRoute.css";

  /* =========================================================
   PROTECTED ROUTE
  ========================================================= */

export default function ProtectedRoute() {
  const location = useLocation();

  /* =======================================================
     CHECK ACCESS TOKEN
  ======================================================= */

  const accessToken =
    localStorage.getItem("access_token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("token");

  /* =======================================================
     NOT AUTHENTICATED
  ======================================================= */

  if (!accessToken) {
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

  /* =======================================================
     AUTHENTICATED
  ======================================================= */

  return <Outlet />;
}