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

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("userEmail");

    navigate("/login", {
      replace: true,
    });
  };

  return (
    <aside className="sidebar">

      {/* =========================================
          BRAND
      ========================================= */}

      <button
        type="button"
        className="sidebar-brand"
        onClick={() => navigate("/dashboard")}
        aria-label="Go to Ledgerly dashboard"
      >
        <div className="login-logo">
        <img src="/ledgerly-30x30.png" alt="Ledgerly" />
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


      {/* =========================================
          NAVIGATION
      ========================================= */}

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
                      isActive ? "active" : ""
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


      {/* =========================================
          BOTTOM AREA
      ========================================= */}

      <div className="sidebar-bottom">

        {/* SETTINGS */}

        <NavLink
          to="/settings"
          end
          className={({ isActive }) =>
            `nav-item settings-link ${
              isActive ? "active" : ""
            }`
          }
        >
          <Settings className="nav-icon" />

          <span className="nav-label">
            Settings
          </span>
        </NavLink>


        {/* USER */}

        <div className="sidebar-user">

          <div className="avatar">
            VK
          </div>

          <div className="user-copy">
            <strong>
              Vinayak
            </strong>

            <span>
              Administrator
            </span>
          </div>

          <button
            type="button"
            className="logout-button"
            aria-label="Logout"
            onClick={handleLogout}
          >
            <LogOut />
          </button>

        </div>

      </div>

    </aside>
  );
}