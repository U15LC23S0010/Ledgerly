import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  Info,
  RefreshCw,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import "./Notifications.css";

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [currentMonth, setCurrentMonth] = useState("");

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/dashboard/");
      const data = response.data;
      setCurrentMonth(data?.current_month || "");
      setNotifications(buildNotifications(data));
    } catch (err) {
      console.error("Notifications error:", err);
      setError(
        err.response?.data?.detail ||
          "Unable to load your financial notifications."
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshNotifications() {
    try {
      setRefreshing(true);
      await loadNotifications();
    } finally {
      setRefreshing(false);
    }
  }

  function money(value) {
    return `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function buildNotifications(data) {
    const items = [];
    const financial = data?.financial_summary || {};
    const budget = data?.budget || {};
    const highestExpense = data?.highest_expense;
    const topCategory = data?.top_category;

    const remaining = Number(budget.remaining || 0);
    const percentage = Number(budget.used_percentage || 0);
    const netCashFlow = Number(financial.monthly_net_cash_flow || 0);
    const monthlyExpenses = Number(financial.monthly_expenses || 0);
    const monthlyIncome = Number(financial.monthly_income || 0);

    if (budget.status === "exceeded" || remaining < 0) {
      items.push({
        id: "budget-exceeded",
        type: "warning",
        icon: AlertTriangle,
        title: "Monthly budget exceeded",
        text: `You have exceeded your monthly budget by ${money(
          Math.abs(remaining)
        )}.`,
        action: "View budget",
        path: "/budget",
      });
    } else if (percentage >= 80) {
      items.push({
        id: "budget-warning",
        type: "warning",
        icon: AlertTriangle,
        title: "You're getting close to your budget",
        text: `${percentage.toFixed(1)}% of your monthly budget has been used. ${money(
          remaining
        )} remains.`,
        action: "View budget",
        path: "/budget",
      });
    } else if (budget.monthly_budget) {
      items.push({
        id: "budget-healthy",
        type: "success",
        icon: CheckCircle2,
        title: "You're within budget",
        text: `${money(remaining)} remains from your monthly budget.`,
        action: "View budget",
        path: "/budget",
      });
    }

    if (highestExpense) {
      items.push({
        id: `highest-expense-${highestExpense.id || "latest"}`,
        type: "expense",
        icon: CircleDollarSign,
        title: "Large expense recorded",
        text: `${highestExpense.title || "A recent expense"} — ${money(
          highestExpense.amount
        )}.`,
        action: "View expenses",
        path: "/expenses",
      });
    }

    if (topCategory) {
      items.push({
        id: "top-category",
        type: "insight",
        icon: Sparkles,
        title: `${topCategory} is your top spending category`,
        text: `Your current top category is ${topCategory}. Review your spending to see where you can save.`,
        action: "View analytics",
        path: "/analytics",
      });
    }

    if (netCashFlow < 0) {
      items.push({
        id: "negative-cash-flow",
        type: "warning",
        icon: AlertTriangle,
        title: "Negative monthly cash flow",
        text: `Your monthly expenses are currently higher than your income by ${money(
          Math.abs(netCashFlow)
        )}.`,
        action: "View analytics",
        path: "/analytics",
      });
    } else if (monthlyIncome > 0 && netCashFlow > 0) {
      items.push({
        id: "positive-cash-flow",
        type: "success",
        icon: Wallet,
        title: "Positive monthly cash flow",
        text: `You currently have a positive monthly cash flow of ${money(
          netCashFlow
        )}.`,
        action: "View analytics",
        path: "/analytics",
      });
    }

    if (monthlyExpenses === 0) {
      items.push({
        id: "no-expenses",
        type: "info",
        icon: Info,
        title: "No expenses recorded this month",
        text: "Add your expenses to keep your financial overview accurate.",
        action: "Add expense",
        path: "/expenses",
      });
    }

    if (!items.length) {
      items.push({
        id: "all-caught-up",
        type: "info",
        icon: Bell,
        title: "You're all caught up",
        text: "There are no important financial notifications right now.",
        action: "Go to dashboard",
        path: "/dashboard",
      });
    }

    return items;
  }

  const notificationCount = useMemo(
    () => notifications.length,
    [notifications]
  );

  if (loading) {
    return (
      <div className="notifications-page">
        <div className="notifications-loading">
          <div className="notifications-spinner" />
          <h2>Loading notifications...</h2>
          <p>Checking your latest financial activity.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="notifications-page">
        <div className="notifications-error">
          <AlertTriangle />
          <h2>Unable to load notifications</h2>
          <p>{error}</p>
          <button type="button" onClick={loadNotifications}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <header className="notifications-header">
        <div>
          <div className="notifications-eyebrow">
            <Bell />
            NOTIFICATIONS
          </div>
          <h1>Stay on top of your finances</h1>
          <p>
            Important updates and useful financial signals from your
            LedgerFlow workspace.
          </p>
        </div>

        <div className="notifications-header-actions">
          <button
            className={`notifications-refresh ${
              refreshing ? "refreshing" : ""
            }`}
            type="button"
            onClick={refreshNotifications}
            disabled={refreshing}
          >
            <RefreshCw />
            Refresh
          </button>

          <button
            className="notifications-back"
            type="button"
            onClick={() => navigate("/dashboard")}
          >
            <ChevronLeft />
            Dashboard
          </button>
        </div>
      </header>

      <section className="notifications-summary">
        <div className="notification-summary-icon">
          <Bell />
        </div>
        <div>
          <strong>
            {notificationCount}{" "}
            {notificationCount === 1 ? "notification" : "notifications"}
          </strong>
          <span>Based on your latest financial activity</span>
        </div>
      </section>

      <section className="notifications-panel">
        <div className="notifications-panel-header">
          <div>
            <span>FINANCIAL UPDATES</span>
            <h2>Recent notifications</h2>
          </div>
          {currentMonth && <small>{currentMonth}</small>}
        </div>

        <div className="notification-list">
          {notifications.map((notification) => {
            const Icon = notification.icon;

            return (
              <article
                className={`notification-item ${notification.type}`}
                key={notification.id}
              >
                <div className="notification-icon">
                  <Icon />
                </div>

                <div className="notification-content">
                  <strong>{notification.title}</strong>
                  <p>{notification.text}</p>

                  <button
                    type="button"
                    onClick={() => navigate(notification.path)}
                  >
                    {notification.action}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="notifications-help">
        <div className="notifications-help-icon">
          <Info />
        </div>
        <div>
          <strong>
            Notifications are generated from your dashboard data
          </strong>
          <p>
            Budget status, cash flow, spending categories, and recent
            financial activity are checked automatically.
          </p>
        </div>
      </section>
    </div>
  );
}
