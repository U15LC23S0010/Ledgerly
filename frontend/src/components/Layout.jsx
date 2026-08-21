import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

import "./Layout.css";

export default function Layout() {
  return (
    <div className="app-layout">

      {/* LEFT SIDEBAR */}
      <Sidebar />

      {/* RIGHT SIDE */}
      <div className="app-main">

        {/* TOP NAVIGATION */}
        <Topbar />

        {/* CURRENT PAGE */}
        <main className="app-content">
          <Outlet />
        </main>

      </div>

    </div>
  );
}