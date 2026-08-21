import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

import "./AppLayout.css";

export default function AppLayout() {
  return (
    <div className="app-layout">

      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN APPLICATION AREA */}
      <main className="app-main">
        <Outlet />
      </main>

    </div>
  );
}