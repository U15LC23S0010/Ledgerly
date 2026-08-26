import { Navigate, Outlet, useLocation } from "react-router-dom";
import "./ProtectedRoute.css";

function getAccessToken() {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("token")
  );
}

export default function ProtectedRoute() {
  const location = useLocation();

  const accessToken = getAccessToken();

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

  return <Outlet />;
}