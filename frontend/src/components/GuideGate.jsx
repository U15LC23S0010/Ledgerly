import { Navigate } from "react-router-dom";

export default function GuideGate() {
  const completed = localStorage.getItem(
    "ledgerflow_guide_completed"
  );

  if (completed === "true") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/guide" replace />;
}