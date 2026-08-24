import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Lightbulb,
  MoreHorizontal,
  Plus,
  ReceiptText,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { getDashboard } from "../api/dashboardApi";
import "./Dashboard.css";

/* =========================================================
   SETTINGS / CURRENCY HELPERS
========================================================= */

const SETTINGS_KEY = "ledgerly_settings";

const VALID_CURRENCIES = [
  "INR",
  "USD",
  "EUR",
  "GBP",
];

function getStoredCurrency() {
  /*
   * First use the dedicated currency value written by Settings.
   */
  const directCurrency =
    localStorage.getItem("ledgerly_currency");

  if (
    directCurrency &&
    VALID_CURRENCIES.includes(directCurrency)
  ) {
    return directCurrency;
  }

  /*
   * Fallback to the complete Ledgerly settings object.
   */
  const storedSettings =
    localStorage.getItem(SETTINGS_KEY);

  if (storedSettings) {
    try {
      const parsedSettings =
        JSON.parse(storedSettings);

      if (
        parsedSettings?.currency &&
        VALID_CURRENCIES.includes(
          parsedSettings.currency
        )
      ) {
        return parsedSettings.currency;
      }
    } catch (error) {
      console.error(
        "Unable to read Ledgerly currency settings:",
        error
      );
    }
  }

  /*
   * Final fallback.
   */
  return "INR";
}

function formatCurrency(value, currency) {
  const amount = Number(value || 0);

  const selectedCurrency =
    currency || getStoredCurrency();

  try {
    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: selectedCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    ).format(amount);
  } catch (error) {
    console.error(
      "Currency formatting error:",
      error
    );

    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    ).format(amount);
  }
}

/* =========================================================
   DASHBOARD
========================================================= */

export default function Dashboard() {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  /*
   * Currency is loaded from Ledgerly Settings.
   */
  const [currency, setCurrency] = useState(
    getStoredCurrency()
  );

  const [selectedMonth, setSelectedMonth] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 7)
    );

  /* =======================================================
     LOAD DASHBOARD
  ======================================================= */

  useEffect(() => {
    loadDashboard();
  }, [selectedMonth]);

  /* =======================================================
     LISTEN FOR SETTINGS / CURRENCY CHANGES
  ======================================================= */

  useEffect(() => {
    /*
     * Handle the global settings event.
     */
    const handleSettingsUpdated = (
      event
    ) => {
      const updatedCurrency =
        event.detail?.currency ||
        getStoredCurrency();

      if (
        VALID_CURRENCIES.includes(
          updatedCurrency
        )
      ) {
        setCurrency(updatedCurrency);
      }
    };

    /*
     * Handle the dedicated currency event.
     */
    const handleCurrencyChanged = (
      event
    ) => {
      const updatedCurrency =
        event.detail ||
        getStoredCurrency();

      if (
        VALID_CURRENCIES.includes(
          updatedCurrency
        )
      ) {
        setCurrency(updatedCurrency);
      }
    };

    /*
     * Also handle browser storage changes.
     * This helps when Settings changes localStorage.
     */
    const handleStorageChange = (
      event
    ) => {
      if (
        event.key ===
          "ledgerly_currency" ||
        event.key === SETTINGS_KEY
      ) {
        setCurrency(
          getStoredCurrency()
        );
      }
    };

    window.addEventListener(
      "ledgerly-settings-updated",
      handleSettingsUpdated
    );

    window.addEventListener(
      "ledgerly-currency-changed",
      handleCurrencyChanged
    );

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    /*
     * Sync once when Dashboard mounts.
     */
    setCurrency(getStoredCurrency());

    return () => {
      window.removeEventListener(
        "ledgerly-settings-updated",
        handleSettingsUpdated
      );

      window.removeEventListener(
        "ledgerly-currency-changed",
        handleCurrencyChanged
      );

      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  }, []);

  /* =======================================================
     LOAD DASHBOARD DATA
  ======================================================= */

  async function loadDashboard(
    showRefresh = false
  ) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response =
        await getDashboard(
          selectedMonth
        );

      setDashboard(response.data);
    } catch (err) {
      console.error(
        "Dashboard error:",
        err
      );

      if (
        err.response?.status === 401
      ) {
        setError(
          "Your session has expired. Please sign in again."
        );
      } else {
        setError(
          err.response?.data?.detail ||
            "Unable to load dashboard data."
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  /* =======================================================
     SELECTED MONTH LABEL
  ======================================================= */

  const selectedMonthLabel =
    useMemo(() => {
      const [year, month] =
        selectedMonth
          .split("-")
          .map(Number);

      if (!year || !month) {
        return "";
      }

      const first = new Date(
        year,
        month - 1,
        1
      );

      const last = new Date(
        year,
        month,
        0
      );

      const formatDay = (value) =>
        value.toLocaleDateString(
          "en-IN",
          {
            day: "2-digit",
            month: "short",
          }
        );

      return `${formatDay(
        first
      )} — ${formatDay(last)} ${year}`;
    }, [selectedMonth]);

  /* =======================================================
     SELECTED MONTH NAME
  ======================================================= */

  const selectedMonthName =
    useMemo(() => {
      const [year, month] =
        selectedMonth
          .split("-")
          .map(Number);

      if (!year || !month) {
        return "";
      }

      return new Date(
        year,
        month - 1,
        1
      ).toLocaleDateString(
        "en-IN",
        {
          month: "short",
          year: "numeric",
        }
      );
    }, [selectedMonth]);

  /* =======================================================
     CATEGORY DATA
  ======================================================= */

  const categoryData =
    useMemo(() => {
      if (
        !dashboard?.category_summary
      ) {
        return [];
      }

      const colors = [
        "#4f46e5",
        "#3b82f6",
        "#f59e0b",
        "#22c55e",
        "#ec4899",
        "#8b5cf6",
        "#14b8a6",
        "#94a3b8",
      ];

      return dashboard.category_summary.map(
        (item, index) => ({
          name:
            item.category ||
            "Uncategorized",

          total: Number(
            item.total || 0
          ),

          color:
            colors[
              index % colors.length
            ],
        })
      );
    }, [dashboard]);

  /* =======================================================
     CATEGORY TOTAL
  ======================================================= */

  const categoryTotal =
    useMemo(
      () =>
        categoryData.reduce(
          (total, item) =>
            total + item.total,
          0
        ),
      [categoryData]
    );

  /* =======================================================
     DONUT
  ======================================================= */

  const donut = useMemo(() => {
    if (!categoryTotal) {
      return "#e5e7eb 0% 100%";
    }

    let current = 0;

    return categoryData
      .map((item) => {
        const start =
          (current /
            categoryTotal) *
          100;

        current += item.total;

        const end =
          (current /
            categoryTotal) *
          100;

        return `${item.color} ${start}% ${end}%`;
      })
      .join(", ");
  }, [
    categoryData,
    categoryTotal,
  ]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="dashboard-page">

        <div className="dashboard-loading">

          <div className="loading-spinner" />

          <h2>
            Loading your financial overview...
          </h2>

          <p>
            Connecting to your LedgerFlow workspace.
          </p>

        </div>

      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {
    return (
      <div className="dashboard-page">

        <div className="dashboard-error">

          <AlertTriangle />

          <h2>
            Unable to load dashboard
          </h2>

          <p>{error}</p>

          <button
            type="button"
            onClick={() =>
              loadDashboard()
            }
          >
            Try again
          </button>

        </div>

      </div>
    );
  }

  /* =======================================================
     DASHBOARD DATA
  ======================================================= */

  const financial =
    dashboard?.financial_summary ||
    {};

  const budget =
    dashboard?.budget || {};

  const expenseSummary =
    dashboard?.expense_summary ||
    {};

  const transactions =
    dashboard?.recent_transactions ||
    [];

  const accounts =
    dashboard?.accounts || [];

  const username =
    dashboard?.user || "User";

  const totalAccountBalance =
    accounts.reduce(
      (total, account) =>
        total +
        Number(
          account.balance || 0
        ),
      0
    );

  const totalIncome =
    Number(
      financial.total_income || 0
    );

  const totalExpenses =
    Number(
      financial.total_expenses || 0
    );

  const monthlyIncome =
    Number(
      financial.monthly_income || 0
    );

  const monthlyExpenses =
    Number(
      financial.monthly_expenses || 0
    );

  const monthlyNetCashFlow =
    Number(
      financial.monthly_net_cash_flow ||
        0
    );

  const budgetPercentage =
    Number(
      budget.used_percentage || 0
    );

  const budgetRemaining =
    Number(
      budget.remaining || 0
    );

  console.log(
    "DASHBOARD ACCOUNTS:",
    accounts
  );

  console.log(
    "TOTAL ACCOUNT BALANCE:",
    totalAccountBalance
  );

  console.log(
    "FINANCIAL SUMMARY:",
    financial
  );

  console.log(
    "DASHBOARD CURRENCY:",
    currency
  );

  /* =======================================================
     BUDGET STATUS
  ======================================================= */

  function getBudgetStatus() {
    if (
      budget.status === "not_set"
    ) {
      return {
        title: "Budget not set",

        text:
          "Create a monthly budget to start tracking your spending.",

        tone: "blue",

        icon: CircleDollarSign,
      };
    }

    if (
      budget.status === "exceeded"
    ) {
      return {
        title: "Budget exceeded",

        text: `You've exceeded your budget by ${formatCurrency(
          Math.abs(
            budgetRemaining
          ),
          currency
        )}.`,

        tone: "red",

        icon: AlertTriangle,
      };
    }

    if (
      budget.status === "warning"
    ) {
      return {
        title: "Budget warning",

        text: `${formatCurrency(
          budgetRemaining,
          currency
        )} remains in your monthly budget.`,

        tone: "orange",

        icon: AlertTriangle,
      };
    }

    return {
      title:
        "You're within budget",

      text: `${formatCurrency(
        budgetRemaining,
        currency
      )} remains in your monthly budget.`,

      tone: "green",

      icon: CheckCircle2,
    };
  }

  const budgetStatus =
    getBudgetStatus();

  /* =======================================================
     NAVIGATION
  ======================================================= */

  function goTo(path) {
    navigate(path);
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="dashboard-page">

      {/* HEADER */}

      <div className="dash-heading">

        <div>

          <div className="eyebrow">

            FINANCIAL OVERVIEW

            <span className="live-dot">
              LIVE
            </span>

          </div>

          <h1>
            Good morning, {username}
          </h1>

          <p>
            Here’s what’s happening across your books today.
          </p>

        </div>

        <div className="dashboard-header-actions">

          <button
            type="button"
            className="refresh-dashboard-button"
            onClick={() =>
              loadDashboard(true)
            }
            disabled={refreshing}
          >

            <RefreshCw
              className={
                refreshing
                  ? "refresh-icon spinning"
                  : "refresh-icon"
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}

          </button>

          <label className="date-filter">

            <CalendarDays />

            <select
              value={selectedMonth}
              onChange={(event) =>
                setSelectedMonth(
                  event.target.value
                )
              }
              aria-label="Select dashboard month"
            >

              {Array.from(
                { length: 12 },
                (_, index) => {
                  const year =
                    new Date().getFullYear();

                  const month =
                    index + 1;

                  const value = `${year}-${String(
                    month
                  ).padStart(2, "0")}`;

                  const label =
                    new Date(
                      year,
                      index,
                      1
                    ).toLocaleDateString(
                      "en-IN",
                      {
                        month: "long",
                        year: "numeric",
                      }
                    );

                  return (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  );
                }
              )}

            </select>

            <ChevronDown />

          </label>

        </div>

      </div>

      {/* STAT CARDS */}

      <section className="stat-grid">

        <Stat
          title="Total Balance"
          value={formatCurrency(
            totalAccountBalance,
            currency
          )}
          change="Current account balance"
          tone="blue"
          icon={Wallet}
        />

        <Stat
          title="Total Income"
          value={formatCurrency(
            totalIncome,
            currency
          )}
          change={`This month ${formatCurrency(
            monthlyIncome,
            currency
          )}`}
          tone="green"
          icon={ArrowDownRight}
        />

        <Stat
          title="Total Expenses"
          value={formatCurrency(
            totalExpenses,
            currency
          )}
          change={`This month ${formatCurrency(
            monthlyExpenses,
            currency
          )}`}
          tone="red"
          icon={ArrowUpRight}
        />

        <Stat
          title="Budget Used"
          value={`${budgetPercentage.toFixed(
            1
          )}%`}
          change={
            budget.monthly_budget
              ? `${formatCurrency(
                  monthlyExpenses,
                  currency
                )} of ${formatCurrency(
                  budget.monthly_budget,
                  currency
                )}`
              : "No monthly budget set"
          }
          tone="orange"
          icon={CircleDollarSign}
          progress={Math.min(
            budgetPercentage,
            100
          )}
        />

      </section>

      {/* CASH FLOW */}

      <section className="dashboard-cashflow-grid">

        <div className="panel cashflow-card">

          <div className="cashflow-icon income">
            <TrendingUp />
          </div>

          <div>

            <span>
              Monthly income
            </span>

            <strong>
              {formatCurrency(
                monthlyIncome,
                currency
              )}
            </strong>

          </div>

        </div>

        <div className="panel cashflow-card">

          <div className="cashflow-icon expense">
            <TrendingDown />
          </div>

          <div>

            <span>
              Monthly expenses
            </span>

            <strong>
              {formatCurrency(
                monthlyExpenses,
                currency
              )}
            </strong>

          </div>

        </div>

        <div className="panel cashflow-card">

          <div className="cashflow-icon balance">
            <Wallet />
          </div>

          <div>

            <span>
              Monthly cash flow
            </span>

            <strong
              className={
                monthlyNetCashFlow >= 0
                  ? "positive"
                  : "negative"
              }
            >
              {formatCurrency(
                monthlyNetCashFlow,
                currency
              )}
            </strong>

          </div>

        </div>

        <div className="panel cashflow-card">

          <div className="cashflow-icon records">
            <ReceiptText />
          </div>

          <div>

            <span>
              Expenses recorded
            </span>

            <strong>
              {expenseSummary.monthly_expense_records ||
                0}
            </strong>

          </div>

        </div>

      </section>

      {/* ANALYSIS */}

      <section className="dashboard-grid">

        <div className="panel spending-panel">

          <PanelTitle
            eyebrow="SPENDING ANALYSIS"
            title="Where your money goes"
            action={selectedMonthName}
          />

          <div className="spending-body">

            <div
              className="donut"
              style={{
                "--donut": `conic-gradient(${donut})`,
              }}
            >

              <div>

                <strong>
                  {formatCurrency(
                    monthlyExpenses,
                    currency
                  )}
                </strong>

                <span>
                  {selectedMonthName}
                </span>

              </div>

            </div>

            <div className="legend">

              {categoryData.length === 0 ? (
                <div className="empty-state">

                  <ReceiptText />

                  <span>
                    No expense categories yet.
                  </span>

                </div>
              ) : (
                categoryData
                  .slice(0, 8)
                  .map((category) => (
                    <div
                      className="legend-row"
                      key={category.name}
                    >

                      <span>

                        <i
                          style={{
                            background:
                              category.color,
                          }}
                        />

                        {category.name}

                      </span>

                      <b>
                        {formatCurrency(
                          category.total,
                          currency
                        )}
                      </b>

                      <small>
                        {categoryTotal
                          ? Math.round(
                              (category.total /
                                categoryTotal) *
                                100
                            )
                          : 0}
                        %
                      </small>

                    </div>
                  ))
              )}

            </div>

          </div>

          <button
            className="outline-button"
            type="button"
            onClick={() =>
              goTo("/analytics")
            }
          >

            <BarChart3 />

            View full analytics

          </button>

        </div>

        {/* AI INSIGHTS */}

        <div className="panel">

          <PanelTitle
            eyebrow="INTELLIGENCE"
            title="AI Insights"
            action="View all"
            onAction={() =>
              goTo("/insights")
            }
          />

          <div className="insights">

            <Insight
              icon={Sparkles}
              tone="purple"
              title={
                dashboard?.top_category
                  ? `${dashboard.top_category} is your top category`
                  : "No spending pattern yet"
              }
              text={
                dashboard?.top_category
                  ? `You've spent ${formatCurrency(
                      dashboard.top_category_amount,
                      currency
                    )} in this category.`
                  : "Add some expenses to generate insights."
              }
            />

            <Insight
              icon={budgetStatus.icon}
              tone={budgetStatus.tone}
              title={budgetStatus.title}
              text={budgetStatus.text}
            />

            <Insight
              icon={Lightbulb}
              tone="blue"
              title="Net cash flow"
              text={`Your current net cash flow is ${formatCurrency(
                financial.net_cash_flow,
                currency
              )}.`}
            />

          </div>

        </div>

      </section>

      {/* HIGHEST EXPENSE */}

      {dashboard?.highest_expense && (
        <section className="panel highest-expense-panel">

          <div className="highest-expense-icon">
            <ArrowUpRight />
          </div>

          <div className="highest-expense-content">

            <span>
              HIGHEST EXPENSE
            </span>

            <strong>
              {dashboard.highest_expense.title}
            </strong>

            <small>
              {formatDate(
                dashboard.highest_expense.date
              )}
            </small>

          </div>

          <b>
            {formatCurrency(
              dashboard.highest_expense.amount,
              currency
            )}
          </b>

        </section>
      )}

      {/* TRANSACTIONS + QUICK ACTIONS */}

      <section className="bottom-grid">

        <div className="panel transactions-panel">

          <PanelTitle
            eyebrow="ACTIVITY"
            title="Recent transactions"
            action="View all"
            onAction={() =>
              goTo("/transactions")
            }
          />

          <div className="table-head">

            <span>Date</span>
            <span>Description</span>
            <span>Type</span>
            <span>Account</span>
            <span>Amount</span>

          </div>

          {transactions.length === 0 ? (
            <div className="empty-transactions">

              <ReceiptText />

              <strong>
                No transactions yet
              </strong>

              <span>
                Your recent transactions will
                appear here.
              </span>

              <button
                className="outline-button"
                type="button"
                onClick={() =>
                  goTo("/transactions")
                }
              >

                <Plus />

                Add transaction

              </button>

            </div>
          ) : (
            transactions.map(
              (transaction) => {

                const income =
                  transaction.transaction_type ===
                  "income";

                const transfer =
                  transaction.transaction_type ===
                  "transfer";

                return (
                  <div
                    className="transaction-row"
                    key={transaction.id}
                  >

                    <span>
                      {formatDate(
                        transaction.date
                      )}
                    </span>

                    <strong>

                      <span className="txn-icon">
                        <ReceiptText />
                      </span>

                      {transaction.description ||
                        "Transaction"}

                    </strong>

                    <span>

                      <em
                        className={`tag ${
                          income
                            ? "income"
                            : transfer
                            ? "transfer"
                            : ""
                        }`}
                      >

                        {transfer
                          ? "Transfer"
                          : income
                          ? "Income"
                          : "Expense"}

                      </em>

                    </span>

                    <span className="transaction-account">

                      <div>
                        {transaction.account_name ||
                          (transaction.account_id
                            ? `Account #${transaction.account_id}`
                            : "—")}
                      </div>

                      {transaction.category_name && (
                        <small className="transaction-category">
                          {
                            transaction.category_name
                          }
                        </small>
                      )}

                    </span>

                    <b
                      className={
                        transfer
                          ? "transfer"
                          : income
                          ? "positive"
                          : "negative"
                      }
                    >

                      {transfer
                        ? ""
                        : income
                        ? "+"
                        : "-"}{" "}

                      {formatCurrency(
                        Math.abs(
                          Number(
                            transaction.amount ||
                              0
                          )
                        ),
                        currency
                      )}

                    </b>

                  </div>
                );
              }
            )
          )}

        </div>

        {/* QUICK ACTIONS */}

        <div className="panel quick-panel">

          <PanelTitle
            eyebrow="WORKSPACE"
            title="Quick actions"
          />

          <div className="quick-grid">

            <Action
              icon={Plus}
              title="Add transaction"
              text="Record income or expense"
              onClick={() =>
                goTo("/transactions")
              }
            />

            <Action
              icon={ReceiptText}
              title="Add expense"
              text="Track your expenses"
              onClick={() =>
                goTo("/expenses")
              }
            />

            <Action
              icon={Wallet}
              title="Manage budget"
              text="Set and track budgets"
              onClick={() =>
                goTo("/budget")
              }
            />

            <Action
              icon={BarChart3}
              title="View analytics"
              text="Analyze financial activity"
              onClick={() =>
                goTo("/analytics")
              }
            />

            <Action
              icon={Sparkles}
              title="AI insights"
              text="Get intelligent financial insights"
              onClick={() =>
                goTo("/insights")
              }
            />

            <Action
              icon={Wallet}
              title="Manage accounts"
              text="View your financial accounts"
              onClick={() =>
                goTo("/accounts")
              }
            />

          </div>

        </div>

      </section>

      {/* ACCOUNTS */}

      <section className="panel accounts-dashboard-panel">

        <PanelTitle
          eyebrow="ACCOUNTS"
          title="Your accounts"
          action="View accounts"
          onAction={() =>
            goTo("/accounts")
          }
        />

        <div className="dashboard-accounts">

          {!accounts ||
          accounts.length === 0 ? (
            <div className="empty-state">

              <Wallet />

              <strong>
                No accounts have been added yet.
              </strong>

              <span>
                Add an account to start tracking
                your balances.
              </span>

              <button
                className="outline-button"
                type="button"
                onClick={() =>
                  goTo("/accounts")
                }
              >

                <Plus />

                Add account

              </button>

            </div>
          ) : (
            accounts.map(
              (account) => (
                <div
                  className="dashboard-account"
                  key={account.id}
                >

                  <div className="account-icon">
                    <Wallet />
                  </div>

                  <div>

                    <strong>
                      {account.name}
                    </strong>

                    <span>
                      {account.account_type}
                    </span>

                  </div>

                  <b>
                    {formatCurrency(
                      account.balance,
                      currency
                    )}
                  </b>

                </div>
              )
            )
          )}

        </div>

      </section>

    </div>
  );
}

/* =========================================================
   STAT
========================================================= */

function Stat({
  title,
  value,
  change,
  tone,
  icon: Icon,
  progress,
}) {
  return (
    <article
      className={`stat-card ${tone}`}
    >

      <div className="stat-top">

        <span>
          {title}
        </span>

        <i>
          <Icon />
        </i>

      </div>

      <strong>
        {value}
      </strong>

      {progress !== undefined ? (
        <div className="stat-progress">

          <span
            style={{
              width: `${Math.min(
                Math.max(
                  progress,
                  0
                ),
                100
              )}%`,
            }}
          />

        </div>
      ) : (
        <div className="mini-line">
          <span />
        </div>
      )}

      <small>
        {change}
      </small>

    </article>
  );
}

/* =========================================================
   PANEL TITLE
========================================================= */

function PanelTitle({
  eyebrow,
  title,
  action,
  onAction,
}) {
  return (
    <div className="panel-title">

      <div>

        <span>
          {eyebrow}
        </span>

        <h2>
          {title}
        </h2>

      </div>

      {action && (
        <button
          type="button"
          onClick={onAction}
        >

          {action}

          {action !== "View all" &&
            action !==
              "View accounts" && (
              <ChevronDown />
            )}

        </button>
      )}

    </div>
  );
}

/* =========================================================
   INSIGHT
========================================================= */

function Insight({
  icon: Icon,
  tone,
  title,
  text,
}) {
  return (
    <div
      className={`insight ${tone}`}
    >

      <i>
        <Icon />
      </i>

      <div>

        <strong>
          {title}
        </strong>

        <p>
          {text}
        </p>

      </div>

      <button
        type="button"
        className="insight-more"
        title="More options"
        aria-label="More options"
      >
        <MoreHorizontal />
      </button>

    </div>
  );
}

/* =========================================================
   QUICK ACTION
========================================================= */

function Action({
  icon: Icon,
  title,
  text,
  onClick,
}) {
  return (
    <button
      type="button"
      className="action-card"
      onClick={onClick}
    >

      <i>
        <Icon />
      </i>

      <div>

        <strong>
          {title}
        </strong>

        <span>
          {text}
        </span>

      </div>

    </button>
  );
}

/* =========================================================
   DATE FORMAT
========================================================= */

function formatDate(date) {
  if (!date) {
    return "—";
  }

  const parsed =
    new Date(date);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return String(date);
  }

  return parsed.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}