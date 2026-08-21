import { Navigate } from "react-router-dom";

export default function GuideGate() {
  return <Navigate to="/welcome" replace />;
}