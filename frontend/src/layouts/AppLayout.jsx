import { Outlet } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

import "./AppLayout.css";

export default function AppLayout() {
  return (
    <div className="app-layout">

      <Sidebar />

      <div className="app-main">

        <Topbar />

        <main className="app-content">
          <Outlet />
        </main>

      </div>

    </div>
  );
}