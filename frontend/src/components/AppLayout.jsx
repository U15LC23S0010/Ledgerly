import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import "./AppLayout.css";

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="app-main">
        {mobileOpen && (
          <button
            type="button"
            className="mobile-sidebar-overlay"
            aria-label="Close navigation menu"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <Topbar
          onMenuClick={() => setMobileOpen(true)}
        />

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
