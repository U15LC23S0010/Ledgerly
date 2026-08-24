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

/* =========================================================
   SIDEBAR SECTIONS
========================================================= */

const sections = [
  {
    title: "WORKSPACE",

    items: [
      {
        label: "Dashboard",
        path: "/dashboard",
        icon: LayoutDashboard,
      },

      {
        label: "Transactions",
        path: "/transactions",
        icon: ArrowLeftRight,
      },

      {
        label: "Expenses",
        path: "/expenses",
        icon: ReceiptText,
      },

      {
        label: "Auto Expense",
        path: "/auto-expense",
        icon: WandSparkles,
      },

      {
        label: "Categories",
        path: "/categories",
        icon: Tags,
      },

      {
        label: "Budget",
        path: "/budget",
        icon: WalletCards,
      },
    ],
  },

  {
    title: "ANALYZE",

    items: [
      {
        label: "Analytics",
        path: "/analytics",
        icon: BarChart3,
      },

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
      {
        label: "Accounts",
        path: "/accounts",
        icon: Landmark,
      },

      {
        label: "Customers",
        path: "/customers",
        icon: Users,
      },

      {
        label: "Vendors",
        path: "/vendors",
        icon: Store,
      },

      {
        label: "Invoices",
        path: "/invoices",
        icon: FileText,
      },

      {
        label: "Reports",
        path: "/reports",
        icon: ChartNoAxesCombined,
      },
    ],
  },
];

/* =========================================================
   HELPER
========================================================= */

function getStoredUser() {
  try {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      return null;
    }

    return JSON.parse(storedUser);
  } catch (error) {
    console.error("Unable to read stored user:", error);
    return null;
  }
}


export default function Sidebar() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => getStoredUser());

  useEffect(() => {
    const handleStorageChange = () => {
      setUser(getStoredUser());
    };

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  }, []);

  /* =========================================================
     USER INFORMATION
  ========================================================= */

  const fullName =
    user?.full_name ||
    user?.name ||
    user?.username ||
    user?.first_name ||
    user?.email?.split("@")[0] ||
    "User";

  const email =
    user?.email ||
    "";

  const role =
    user?.role ||
    "Administrator";

  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join("") || "U";


  const handleSettings = () => {
    navigate("/settings");
  };

  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("access_token");

    localStorage.removeItem("refresh");
    localStorage.removeItem("refresh_token");

    localStorage.removeItem("token");

    localStorage.removeItem("user");
    localStorage.removeItem("userEmail");

    sessionStorage.removeItem(
      "ledgerly_registration"
    );

    sessionStorage.removeItem(
      "ledgerly_registration_email"
    );

    sessionStorage.removeItem(
      "ledgerly_registration_mobile"
    );

    sessionStorage.removeItem(
      "ledgerly_show_welcome"
    );

    /*
     * Go back to login.
     */

    navigate("/login", {
      replace: true,
    });
  };

  return (
    <aside className="sidebar">

      {/* =====================================================
          BRAND
      ===================================================== */}

      <button
        type="button"
        className="sidebar-brand"
        onClick={() => navigate("/dashboard")}
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

          <small>
            SMART BOOKKEEPING
          </small>

        </div>

      </button>


      {/* =====================================================
          NAVIGATION
      ===================================================== */}

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
                  className={({ isActive }) =>
                    `nav-item ${
                      isActive
                        ? "active"
                        : ""
                    }`
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


      {/* =====================================================
          BOTTOM AREA
      ===================================================== */}

      <div className="sidebar-bottom">


        {/* ===================================================
            SETTINGS
        =================================================== */}

        <NavLink
          to="/settings"
          end
          className={({ isActive }) =>
            `nav-item settings-link ${
              isActive
                ? "active"
                : ""
            }`
          }
        >

          <Settings className="nav-icon" />

          <span className="nav-label">
            Settings
          </span>

        </NavLink>


        {/* ===================================================
            USER INFORMATION
        =================================================== */}

        <div className="sidebar-user">

          {/* AVATAR */}

          <div
            className="avatar"
            title={fullName}
          >
            {initials}
          </div>


          {/* USER DETAILS */}

          <button
            type="button"
            className="user-copy"
            onClick={handleSettings}
            title="Open Settings"
          >

            <strong>
              {fullName}
            </strong>

            <span>
              {email || role}
            </span>

          </button>


          {/* LOGOUT */}

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