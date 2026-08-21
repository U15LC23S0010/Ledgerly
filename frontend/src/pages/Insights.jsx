import { useState } from "react";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  IndianRupee,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { getInsights } from "../api/insightsApi";
import "./Insights.css";


export default function Insights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  // =========================================================
  // LOAD AI INSIGHTS
  // =========================================================

  async function generateInsights() {
    try {
      setLoading(true);
      setError("");

      const response = await getInsights();

      setData(response.data);

    } catch (err) {
      console.error("Insights error:", err);

      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(
          detail
            .map((item) => item.msg || "Validation error")
            .join(", ")
        );
      } else if (typeof detail === "object" && detail !== null) {
        setError(
          detail.message ||
          "Unable to generate financial insights."
        );
      } else {
        setError(
          detail ||
          err.message ||
          "Unable to generate financial insights."
        );
      }

    } finally {
      setLoading(false);
    }
  }


  // =========================================================
  // FORMAT CURRENCY
  // =========================================================

  function formatCurrency(value) {
    const amount = Number(value || 0);

    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }


  // =========================================================
  // FORMAT DATE
  // =========================================================

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return String(value);
    }

    return parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }


  // =========================================================
  // HEALTH SCORE CLASS
  // =========================================================

  function getScoreClass(score) {
    const value = Number(score || 0);

    if (value >= 85) {
      return "excellent";
    }

    if (value >= 70) {
      return "good";
    }

    if (value >= 50) {
      return "attention";
    }

    return "critical";
  }


  // =========================================================
  // TREND
  // =========================================================

  function getTrend() {
    if (!data?.summary) {
      return null;
    }

    const current = Number(
      data.summary.total_expenses || 0
    );

    const previous = Number(
      data.summary.previous_month_expenses || 0
    );

    if (previous <= 0) {
      return null;
    }

    const percentage =
      ((current - previous) / previous) * 100;

    return {
      value: Math.abs(percentage).toFixed(1),
      increase: percentage > 0,
      unchanged: percentage === 0,
    };
  }


  const trend = getTrend();


  // =========================================================
  // SAFE DATA
  // =========================================================

  const summary = data?.summary || {};

  const health = data?.financial_health || {};

  const categories =
    Array.isArray(data?.category_analysis)
      ? data.category_analysis
      : [];

  const topExpenses =
    Array.isArray(data?.top_expenses)
      ? data.top_expenses
      : [];

  const unusualExpenses =
    Array.isArray(data?.unusual_expenses)
      ? data.unusual_expenses
      : [];

  const aiInsights =
    Array.isArray(data?.ai_insights)
      ? data.ai_insights
      : [];

  const warnings =
    Array.isArray(data?.warnings)
      ? data.warnings
      : [];

  const recommendations =
    Array.isArray(data?.recommendations)
      ? data.recommendations
      : [];

  const dailyAnalysis =
    data?.daily_analysis || {};

  const budget =
    data?.budget_analysis || {};


  // =========================================================
  // BUDGET STATUS TEXT
  // =========================================================

  function getBudgetStatusText(status) {
    switch (status) {
      case "healthy":
        return "Budget is on track";

      case "warning":
        return "Budget needs attention";

      case "exceeded":
        return "Budget exceeded";

      default:
        return "Budget not set";
    }
  }


  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="insights-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="insights-header">

        <div className="insights-heading">

          <div className="insights-heading-icon">
            <Sparkles size={25} />
          </div>

          <div>
            <h1>AI Insights</h1>

            <p>
              Intelligent analysis of your financial activity.
            </p>
          </div>

        </div>


        <button
          type="button"
          className="generate-btn"
          onClick={generateInsights}
          disabled={loading}
        >

          {loading ? (
            <>
              <RefreshCw
                size={17}
                className="spin"
              />

              Analyzing...
            </>
          ) : (
            <>
              <Sparkles size={17} />

              {data
                ? "Refresh Insights"
                : "Generate Insights"}
            </>
          )}

        </button>

      </div>


      {/* =====================================================
          INITIAL STATE
      ===================================================== */}

      {!data && !loading && !error && (

        <div className="welcome-card">

          <div className="welcome-icon">
            <Sparkles size={34} />
          </div>

          <h2>
            Turn your financial data into useful insights
          </h2>

          <p>
            LedgerFlow AI analyzes your spending patterns,
            categories, budget usage, unusual transactions,
            and month-to-month changes to help you understand
            your finances better.
          </p>

          <button
            type="button"
            className="welcome-btn"
            onClick={generateInsights}
          >
            <Sparkles size={17} />

            Analyze My Finances
          </button>

        </div>

      )}


      {/* =====================================================
          LOADING
      ===================================================== */}

      {loading && (

        <div className="loading-card">

          <div className="loading-orb">
            <Sparkles size={30} />
          </div>

          <h2>
            Analyzing your finances
          </h2>

          <p>
            LedgerFlow AI is reviewing your transactions,
            spending patterns, budget usage and categories.
          </p>

          <div className="analysis-steps">

            <div className="analysis-step active">
              <Activity size={16} />

              Analyzing transactions
            </div>

            <div className="analysis-step active">
              <BarChart3 size={16} />

              Comparing spending
            </div>

            <div className="analysis-step active">
              <Lightbulb size={16} />

              Generating recommendations
            </div>

          </div>

          <div className="loading-line">
            <div />
          </div>

        </div>

      )}


      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && !loading && (

        <div className="error-card">

          <div className="error-icon">
            <AlertTriangle size={23} />
          </div>

          <div className="error-content">

            <h3>
              Unable to generate insights
            </h3>

            <p>
              {error}
            </p>

            <button
              type="button"
              className="retry-btn"
              onClick={generateInsights}
            >
              <RefreshCw size={15} />

              Try Again
            </button>

          </div>

        </div>

      )}


      {/* =====================================================
          DASHBOARD
      ===================================================== */}

      {data && !loading && (

        <>

          {/* =================================================
              FINANCIAL HEALTH
          ================================================= */}

          <div className="health-card">

            <div className="health-left">

              <div className="health-icon">
                <Activity size={24} />
              </div>

              <div>

                <span className="section-label">
                  FINANCIAL HEALTH
                </span>

                <h2>
                  {health.label || "Not Available"}
                </h2>

                <p>
                  Based on your current spending,
                  budget usage and financial activity.
                </p>

              </div>

            </div>


            <div className="health-score">

              <div
                className={`score-circle ${getScoreClass(
                  health.score
                )}`}
              >
                <strong>
                  {Number(health.score || 0)}
                </strong>

                <span>
                  /100
                </span>
              </div>

            </div>

          </div>


          {/* =================================================
              SUMMARY CARDS
          ================================================= */}

          <div className="summary-grid">

            {/* TOTAL EXPENSES */}

            <div className="summary-card">

              <div className="summary-top">

                <span>
                  Total Expenses
                </span>

                <div className="summary-icon purple">
                  <Wallet size={19} />
                </div>

              </div>

              <strong>
                {formatCurrency(
                  summary.total_expenses
                )}
              </strong>

              {trend ? (

                <div
                  className={`trend ${
                    trend.increase
                      ? "negative"
                      : "positive"
                  }`}
                >

                  {trend.increase ? (
                    <TrendingUp size={14} />
                  ) : (
                    <TrendingDown size={14} />
                  )}

                  {trend.value}%{" "}

                  {trend.increase
                    ? "higher"
                    : "lower"}{" "}

                  than last month

                </div>

              ) : (

                <small>
                  No previous-month comparison
                </small>

              )}

            </div>


            {/* AVERAGE */}

            <div className="summary-card">

              <div className="summary-top">

                <span>
                  Average Expense
                </span>

                <div className="summary-icon blue">
                  <IndianRupee size={19} />
                </div>

              </div>

              <strong>
                {formatCurrency(
                  summary.average_expense
                )}
              </strong>

              <small>
                Per transaction
              </small>

            </div>


            {/* LARGEST */}

            <div className="summary-card">

              <div className="summary-top">

                <span>
                  Largest Expense
                </span>

                <div className="summary-icon orange">
                  <Target size={19} />
                </div>

              </div>

              <strong>
                {formatCurrency(
                  summary.largest_expense
                )}
              </strong>

              <small>
                Highest transaction this month
              </small>

            </div>


            {/* TRANSACTIONS */}

            <div className="summary-card">

              <div className="summary-top">

                <span>
                  Transactions
                </span>

                <div className="summary-icon green">
                  <BarChart3 size={19} />
                </div>

              </div>

              <strong>
                {summary.expense_count || 0}
              </strong>

              <small>
                Recorded this month
              </small>

            </div>

          </div>


          {/* =================================================
              DAILY + CATEGORY
          ================================================= */}

          <div className="main-grid">

            {/* CATEGORY */}

            <div className="panel category-panel">

              <div className="panel-header">

                <div>

                  <span className="section-label">
                    SPENDING BREAKDOWN
                  </span>

                  <h2>
                    Category Analysis
                  </h2>

                </div>

                <BarChart3 size={21} />

              </div>


              {categories.length > 0 ? (

                <div className="category-list">

                  {categories.map(
                    (category, index) => (

                      <div
                        className="category-item"
                        key={`${category.category}-${index}`}
                      >

                        <div className="category-info">

                          <div className="category-name">
                            {category.category}
                          </div>

                          <div className="category-amount">
                            {formatCurrency(
                              category.amount
                            )}
                          </div>

                        </div>


                        <div className="category-bar">

                          <div
                            className="category-fill"
                            style={{
                              width: `${Math.min(
                                Number(
                                  category.percentage || 0
                                ),
                                100
                              )}%`,
                            }}
                          />

                        </div>


                        <div className="category-percent">
                          {Number(
                            category.percentage || 0
                          ).toFixed(1)}
                          %
                        </div>

                      </div>

                    )
                  )}

                </div>

              ) : (

                <div className="empty-state">
                  No category data available yet.
                </div>

              )}

            </div>


            {/* BUDGET */}

            <div className="panel budget-panel">

              <div className="panel-header">

                <div>

                  <span className="section-label">
                    BUDGET
                  </span>

                  <h2>
                    Budget Analysis
                  </h2>

                </div>

                <Target size={21} />

              </div>


              <div className="budget-status">

                <span
                  className={`status-dot ${
                    budget.status || "not_set"
                  }`}
                />

                <span>
                  {getBudgetStatusText(
                    budget.status
                  )}
                </span>

              </div>


              <div className="budget-percentage">

                <strong>
                  {Math.round(
                    Number(
                      budget.used_percentage || 0
                    )
                  )}
                  %
                </strong>

                <span>
                  used
                </span>

              </div>


              <div className="budget-progress">

                <div
                  style={{
                    width: `${Math.min(
                      Number(
                        budget.used_percentage || 0
                      ),
                      100
                    )}%`,
                  }}
                />

              </div>


              {budget.remaining !== null &&
                budget.remaining !== undefined ? (

                <div className="budget-remaining">

                  <span>
                    Remaining
                  </span>

                  <strong>
                    {formatCurrency(
                      budget.remaining
                    )}
                  </strong>

                </div>

              ) : (

                <div className="budget-empty">
                  Set a monthly budget to receive
                  personalized budget alerts.
                </div>

              )}

            </div>

          </div>


          {/* =================================================
              DAILY SPENDING
          ================================================= */}

          <div className="daily-card">

            <div className="daily-card-icon">
              <Activity size={21} />
            </div>

            <div className="daily-card-content">

              <span className="section-label">
                SPENDING ACTIVITY
              </span>

              <h2>
                Daily Spending
              </h2>

              <p>
                Your average spending on active
                spending days.
              </p>

            </div>


            <div className="daily-stat">

              <strong>
                {formatCurrency(
                  dailyAnalysis.average_daily_spending
                )}
              </strong>

              <span>
                average / active day
              </span>

            </div>


            {dailyAnalysis.highest_spending_day && (

              <div className="highest-day">

                <span>
                  Highest day
                </span>

                <strong>
                  {formatCurrency(
                    dailyAnalysis.highest_spending_day.amount
                  )}
                </strong>

                <small>
                  {formatDate(
                    dailyAnalysis.highest_spending_day.date
                  )}
                </small>

              </div>

            )}

          </div>


          {/* =================================================
              TOP EXPENSES + UNUSUAL
          ================================================= */}

          <div className="main-grid expense-analysis-grid">

            {/* TOP EXPENSES */}

            <div className="panel">

              <div className="panel-header">

                <div>

                  <span className="section-label">
                    LARGEST TRANSACTIONS
                  </span>

                  <h2>
                    Top Expenses
                  </h2>

                </div>

                <Wallet size={21} />

              </div>


              {topExpenses.length > 0 ? (

                <div className="top-expense-list">

                  {topExpenses.map(
                    (expense, index) => (

                      <div
                        className="top-expense-item"
                        key={expense.id || index}
                      >

                        <div className="top-expense-rank">
                          {index + 1}
                        </div>

                        <div className="top-expense-info">

                          <strong>
                            {expense.title ||
                              "Expense"}
                          </strong>

                          <span>
                            {expense.category ||
                              "Uncategorized"}
                            {" • "}
                            {formatDate(
                              expense.date
                            )}
                          </span>

                        </div>

                        <b>
                          {formatCurrency(
                            expense.amount
                          )}
                        </b>

                      </div>

                    )
                  )}

                </div>

              ) : (

                <div className="empty-state">
                  No expenses recorded this month.
                </div>

              )}

            </div>


            {/* UNUSUAL EXPENSES */}

            <div className="panel unusual-panel">

              <div className="panel-header">

                <div>

                  <span className="section-label">
                    ANOMALY DETECTION
                  </span>

                  <h2>
                    Unusual Spending
                  </h2>

                </div>

                <AlertTriangle size={21} />

              </div>


              {unusualExpenses.length > 0 ? (

                <div className="unusual-list">

                  {unusualExpenses.map(
                    (expense, index) => (

                      <div
                        className="unusual-item"
                        key={expense.id || index}
                      >

                        <div className="unusual-icon">
                          <AlertTriangle size={17} />
                        </div>

                        <div className="unusual-info">

                          <strong>
                            {expense.title ||
                              "Unusual expense"}
                          </strong>

                          <span>
                            {formatCurrency(
                              expense.amount
                            )}
                            {" • "}
                            {expense.multiple}x
                            normal transaction
                          </span>

                        </div>

                      </div>

                    )
                  )}

                </div>

              ) : (

                <div className="no-anomaly">

                  <CheckCircle2 size={21} />

                  <div>

                    <strong>
                      No unusual spending detected
                    </strong>

                    <span>
                      Your transactions look normal
                      compared with your recent activity.
                    </span>

                  </div>

                </div>

              )}

            </div>

          </div>


          {/* =================================================
              AI INSIGHTS
          ================================================= */}

          <div className="panel ai-panel">

            <div className="panel-header">

              <div className="ai-title">

                <div className="ai-icon">
                  <Sparkles size={21} />
                </div>

                <div>

                  <span className="section-label">
                    LEDGERFLOW AI
                  </span>

                  <h2>
                    Financial Insights
                  </h2>

                </div>

              </div>

            </div>


            {aiInsights.length > 0 ? (

              <div className="insight-list">

                {aiInsights.map(
                  (item, index) => (

                    <div
                      className="insight-item"
                      key={index}
                    >

                      <div className="insight-number">
                        {index + 1}
                      </div>

                      <p>
                        {item}
                      </p>

                    </div>

                  )
                )}

              </div>

            ) : (

              <div className="empty-state">
                No insights available yet.
              </div>

            )}

          </div>


          {/* =================================================
              WARNINGS + RECOMMENDATIONS
          ================================================= */}

          <div className="bottom-grid">

            {/* WARNINGS */}

            <div className="panel warning-panel">

              <div className="panel-header">

                <div>

                  <span className="section-label">
                    ATTENTION
                  </span>

                  <h2>
                    Warnings
                  </h2>

                </div>

                <AlertTriangle size={21} />

              </div>


              {warnings.length > 0 ? (

                <div className="message-list">

                  {warnings.map(
                    (warning, index) => (

                      <div
                        className="message-item warning"
                        key={index}
                      >

                        <AlertTriangle size={18} />

                        <p>
                          {warning}
                        </p>

                      </div>

                    )
                  )}

                </div>

              ) : (

                <div className="success-message">

                  <CheckCircle2 size={20} />

                  <span>
                    No major financial warnings detected.
                  </span>

                </div>

              )}

            </div>


            {/* RECOMMENDATIONS */}

            <div className="panel recommendation-panel">

              <div className="panel-header">

                <div>

                  <span className="section-label">
                    SMART ACTIONS
                  </span>

                  <h2>
                    Recommendations
                  </h2>

                </div>

                <Lightbulb size={21} />

              </div>


              {recommendations.length > 0 ? (

                <div className="message-list">

                  {recommendations.map(
                    (recommendation, index) => (

                      <div
                        className="message-item recommendation"
                        key={index}
                      >

                        <Lightbulb size={18} />

                        <p>
                          {recommendation}
                        </p>

                      </div>

                    )
                  )}

                </div>

              ) : (

                <div className="success-message">

                  <CheckCircle2 size={20} />

                  <span>
                    Your current financial habits look good.
                  </span>

                </div>

              )}

            </div>

          </div>


          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="insights-footer">

            <div>
              <Sparkles size={15} />

              Generated by LedgerFlow AI

              {data.generated_at && (
                <span className="generated-time">
                  • {formatDate(data.generated_at)}
                </span>
              )}
            </div>


            <button
              type="button"
              onClick={generateInsights}
              disabled={loading}
            >

              <RefreshCw size={14} />

              Refresh Analysis

            </button>

          </div>

        </>

      )}

    </div>
  );
}