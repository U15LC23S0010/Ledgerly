import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  ReceiptText,
  WandSparkles,
  Store,
  Tags,
  WalletCards,
  BarChart3,
  Sparkles,
  Landmark,
  Users,
  FileText,
  ChartNoAxesCombined,
  Settings,
  LogOut,
} from "lucide-react";
import "./Sidebar.css";

const sections = [
  {
    title: "WORKSPACE",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { label: "Transactions", path: "/transactions", icon: ArrowLeftRight },
      { label: "Expenses", path: "/expenses", icon: ReceiptText },
      { label: "Auto Expense", path: "/auto-expense", icon: WandSparkles },
      { label: "Categories", path: "/categories", icon: Tags },
      { label: "Budget", path: "/budget", icon: WalletCards },
    ],
  },
  {
    title: "ANALYZE",
    items: [
      { label: "Analytics", path: "/analytics", icon: BarChart3 },
      {
        label: "AI Insights",
        path: "/insights",
        icon: Sparkles,
        badge: "New",
      },
    ],
  },
  {
    title: "BUSINESS",
    items: [
      { label: "Accounts", path: "/accounts", icon: Landmark },
      { label: "Customers", path: "/customers", icon: Users },
      { label: "Vendors", path: "/vendors", icon: Store },
      { label: "Invoices", path: "/invoices", icon: FileText },
      { label: "Reports", path: "/reports", icon: ChartNoAxesCombined },
    ],
  },
];

function getStoredUser() {
  try {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    console.error("Unable to read stored user:", error);
    return null;
  }
}

export default function Sidebar({
  mobileOpen = false,
  setMobileOpen = () => {},
}) {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());

  useEffect(() => {
    const handleStorageChange = () => {
      setUser(getStoredUser());
    };

    window.addEventListener("storage", handleStorageChange);

    return () =>
      window.removeEventListener("storage", handleStorageChange);
  }, []);

  const fullName =
    user?.full_name ||
    user?.name ||
    user?.username ||
    user?.first_name ||
    user?.email?.split("@")[0] ||
    "User";

  const email = user?.email || "";
  const role = user?.role || "Administrator";

  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U";

  const closeMobileSidebar = () => {
    setMobileOpen(false);
  };

  const handleSettings = () => {
    closeMobileSidebar();
    navigate("/settings");
  };

  const handleLogout = () => {
    [
      "access",
      "access_token",
      "refresh",
      "refresh_token",
      "token",
      "user",
      "userEmail",
    ].forEach((key) => localStorage.removeItem(key));

    [
      "ledgerly_registration",
      "ledgerly_registration_email",
      "ledgerly_registration_mobile",
      "ledgerly_show_welcome",
    ].forEach((key) => sessionStorage.removeItem(key));

    setUser(null);
    closeMobileSidebar();

    navigate("/login", { replace: true });
  };

  const handleBrandClick = () => {
    closeMobileSidebar();
    navigate("/dashboard");
  };

  return (
    <aside
      className={`sidebar ${
        mobileOpen ? "sidebar-mobile-open" : ""
      }`}
      aria-label="Main sidebar"
    >
      <button
        type="button"
        className="sidebar-brand"
        onClick={handleBrandClick}
        aria-label="Go to Ledgerly dashboard"
      >
        <div className="login-logo">
          <img
            src="/ledgerly-30x30.png"
            alt="Ledgerly"
          />
        </div>

        <div className="brand-copy">
          <strong>
            Ledgerly <em></em>
          </strong>
          <small>SMART BOOKKEEPING</small>
        </div>
      </button>

      <nav
        className="sidebar-nav"
        aria-label="Main navigation"
      >
        {sections.map((section) => (
          <div
            className="nav-section"
            key={section.title}
          >
            <div className="nav-section-title">
              {section.title}
            </div>

            {section.items.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end
                  onClick={closeMobileSidebar}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "active" : ""}`
                  }
                >
                  <Icon className="nav-icon" />

                  <span className="nav-label">
                    {item.label}
                  </span>

                  {item.badge && (
                    <span className="nav-badge">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <NavLink
          to="/settings"
          end
          onClick={closeMobileSidebar}
          className={({ isActive }) =>
            `nav-item settings-link ${
              isActive ? "active" : ""
            }`
          }
        >
          <Settings className="nav-icon" />
          <span className="nav-label">Settings</span>
        </NavLink>

        <div className="sidebar-user">
          <div
            className="avatar"
            title={fullName}
          >
            {initials}
          </div>

          <button
            type="button"
            className="user-copy"
            onClick={handleSettings}
            title="Open Settings"
          >
            <strong>{fullName}</strong>
            <span>{email || role}</span>
          </button>

          <button
            type="button"
            className="logout-button"
            aria-label="Logout"
            title="Sign out"
            onClick={handleLogout}
          >
            <LogOut />
          </button>
        </div>
      </div>
    </aside>
  );
}
