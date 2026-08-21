import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  RefreshCw,
  AlertCircle,
  LineChart,
} from "lucide-react";

import "./Analytics.css";

import {
  getAnalyticsSummary,
  getCategorySummary,
  getMonthlySummary,
}from "../api/analytics";

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);

  const [chartType, setChartType] = useState("pie");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================================================
  // FETCH DATA
  // =========================================================

  const fetchAnalytics = async () => {
  try {
    setLoading(true);
    setError("");

    const [
      summaryResponse,
      categoryResponse,
      monthlyResponse,
    ] = await Promise.all([
      getAnalyticsSummary(),
      getCategorySummary(),
      getMonthlySummary(),
    ]);

    setSummary(summaryResponse.data);

    setCategoryData(
      Array.isArray(categoryResponse.data)
        ? categoryResponse.data
        : []
    );

    setMonthlyData(
      Array.isArray(monthlyResponse.data)
        ? monthlyResponse.data
        : []
    );

  } catch (err) {
    console.error("Analytics error:", err);

    setError(
      err?.response?.data?.detail ||
        "Unable to load analytics data."
    );

  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // =========================================================
  // FORMAT MONEY
  // =========================================================

  const formatMoney = (value) => {
    return `₹${Number(value || 0).toLocaleString("en-IN")}`;
  };

  // =========================================================
  // MONTH NAMES
  // =========================================================

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // =========================================================
  // SUMMARY
  // =========================================================

  const totalIncome = Number(
    summary?.total_income || 0
  );

  const totalExpenses = Number(
    summary?.total_expenses || 0
  );

  const balance = Number(
    summary?.balance || 0
  );

  // =========================================================
  // CATEGORY DATA
  // =========================================================

  const categories = useMemo(() => {
    return categoryData
      .map((item) => ({
        name: item.category || "Uncategorized",
        amount: Number(item.total || 0),
      }))
      .filter((item) => item.amount > 0);
  }, [categoryData]);

  // =========================================================
  // MONTHLY DATA
  // =========================================================

  const months = useMemo(() => {
    return monthlyData
      .map((item) => {
        const year = Number(item.year);
        const month = Number(item.month);
        const total = Number(item.total || 0);

        return {
          year,
          month,
          total,
          label:
            month >= 1 && month <= 12
              ? `${monthNames[month - 1]} ${year}`
              : `${month}/${year}`,
        };
      })
      .filter(
        (item) =>
          item.year > 0 &&
          item.month >= 1 &&
          item.month <= 12
      )
      .sort((a, b) => {
        if (a.year !== b.year) {
          return a.year - b.year;
        }

        return a.month - b.month;
      });
  }, [monthlyData]);

  // =========================================================
  // CATEGORY TOTAL
  // =========================================================

  const categoryTotal = useMemo(() => {
    return categories.reduce(
      (sum, item) => sum + item.amount,
      0
    );
  }, [categories]);

  // =========================================================
  // PIE CHART
  // =========================================================

  const pieGradient = useMemo(() => {
    if (!categories.length || categoryTotal <= 0) {
      return "conic-gradient(#e5e7eb 0deg 360deg)";
    }

    const colors = [
      "#4f46e5",
      "#06b6d4",
      "#10b981",
      "#f59e0b",
      "#ef4444",
      "#8b5cf6",
      "#ec4899",
      "#14b8a6",
      "#f97316",
      "#6366f1",
    ];

    let currentDegree = 0;

    const sections = categories.map(
      (item, index) => {
        const percentage =
          item.amount / categoryTotal;

        const degree = percentage * 360;

        const start = currentDegree;
        const end = currentDegree + degree;

        currentDegree = end;

        return `${colors[index % colors.length]} ${start}deg ${end}deg`;
      }
    );

    return `conic-gradient(${sections.join(", ")})`;
  }, [categories, categoryTotal]);

  // =========================================================
  // BAR CHART
  // =========================================================

  const maxCategoryAmount = useMemo(() => {
    if (!categories.length) {
      return 0;
    }

    return Math.max(
      ...categories.map(
        (item) => item.amount
      )
    );
  }, [categories]);

  // =========================================================
  // LINE CHART SETTINGS
  // =========================================================

  const lineChart = useMemo(() => {
    const width = 900;
    const height = 360;

    const paddingLeft = 65;
    const paddingRight = 30;
    const paddingTop = 35;
    const paddingBottom = 65;

    const chartWidth =
      width - paddingLeft - paddingRight;

    const chartHeight =
      height - paddingTop - paddingBottom;

    const maxValue =
      months.length > 0
        ? Math.max(
            ...months.map(
              (item) => item.total
            ),
            1
          )
        : 1;

    const points = months.map(
      (item, index) => {
        let x;

        if (months.length === 1) {
          x = width / 2;
        } else {
          x =
            paddingLeft +
            (index /
              (months.length - 1)) *
              chartWidth;
        }

        const y =
          paddingTop +
          chartHeight -
          (item.total / maxValue) *
            chartHeight;

        return {
          ...item,
          x,
          y,
        };
      }
    );

    const polylinePoints = points
      .map(
        (point) =>
          `${point.x},${point.y}`
      )
      .join(" ");

    return {
      width,
      height,
      paddingLeft,
      paddingRight,
      paddingTop,
      paddingBottom,
      chartWidth,
      chartHeight,
      maxValue,
      points,
      polylinePoints,
    };
  }, [months]);

  // =========================================================
  // LINE Y AXIS
  // =========================================================

  const yAxisValues = useMemo(() => {
    const max = lineChart.maxValue;

    return [
      max,
      max * 0.75,
      max * 0.5,
      max * 0.25,
      0,
    ];
  }, [lineChart.maxValue]);

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="analytics-loading">
          <RefreshCw
            size={28}
            className="loading-icon"
          />

          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error) {
    return (
      <div className="analytics-page">
        <div className="analytics-error">
          <AlertCircle size={34} />

          <h3>
            Unable to load analytics
          </h3>

          <p>{error}</p>

          <button
            className="refresh-btn"
            onClick={fetchAnalytics}
          >
            <RefreshCw size={17} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="analytics-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="analytics-header">
        <div>
          <h1>Analytics</h1>

          <p>
            Track your income, expenses and
            spending patterns.
          </p>
        </div>

        <button
          className="refresh-btn"
          onClick={fetchAnalytics}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {/* =====================================================
          SUMMARY CARDS
      ===================================================== */}

      <div className="analytics-summary-grid">

        <div className="analytics-summary-card">
          <div className="summary-card-icon income-icon">
            <TrendingUp size={22} />
          </div>

          <div>
            <span>Total Income</span>

            <h2>
              {formatMoney(totalIncome)}
            </h2>
          </div>
        </div>

        <div className="analytics-summary-card">
          <div className="summary-card-icon expense-icon">
            <TrendingDown size={22} />
          </div>

          <div>
            <span>Total Expenses</span>

            <h2>
              {formatMoney(totalExpenses)}
            </h2>
          </div>
        </div>

        <div className="analytics-summary-card">
          <div className="summary-card-icon balance-icon">
            <Wallet size={22} />
          </div>

          <div>
            <span>Balance</span>

            <h2>
              {formatMoney(balance)}
            </h2>
          </div>
        </div>

        <div className="analytics-summary-card">
          <div className="summary-card-icon category-icon">
            <PieChart size={22} />
          </div>

          <div>
            <span>Categories</span>

            <h2>
              {categories.length}
            </h2>
          </div>
        </div>

      </div>

      {/* =====================================================
          CHART CARD
      ===================================================== */}

      <div className="analytics-chart-card">

        <div className="chart-header">

          <div>
            <h2>
              Spending Analytics
            </h2>

            <p>
              Analyze your expenses by
              category and month.
            </p>
          </div>

          {/* SELECTOR */}

          <div className="chart-selector">

            <button
              type="button"
              className={
                chartType === "pie"
                  ? "chart-selector-btn active"
                  : "chart-selector-btn"
              }
              onClick={() =>
                setChartType("pie")
              }
            >
              <PieChart size={16} />
              Pie
            </button>

            <button
              type="button"
              className={
                chartType === "bar"
                  ? "chart-selector-btn active"
                  : "chart-selector-btn"
              }
              onClick={() =>
                setChartType("bar")
              }
            >
              <BarChart3 size={16} />
              Bar
            </button>

            <button
              type="button"
              className={
                chartType === "line"
                  ? "chart-selector-btn active"
                  : "chart-selector-btn"
              }
              onClick={() =>
                setChartType("line")
              }
            >
              <LineChart size={16} />
              Line
            </button>

          </div>
        </div>

        {/* ===================================================
            PIE
        =================================================== */}

        {chartType === "pie" && (
          <div className="chart-content">

            {categories.length === 0 ? (
              <div className="empty-chart">
                <PieChart size={42} />

                <p>
                  No category expense data
                  available.
                </p>
              </div>
            ) : (
              <div className="pie-chart-wrapper">

                <div className="pie-chart-container">

                  <div
                    className="pie-chart"
                    style={{
                      background:
                        pieGradient,
                    }}
                  >
                    <div className="pie-chart-center">
                      <span>
                        Total Expenses
                      </span>

                      <strong>
                        {formatMoney(
                          categoryTotal
                        )}
                      </strong>
                    </div>
                  </div>

                </div>

                <div className="pie-legend">

                  {categories.map(
                    (item, index) => {
                      const colors = [
                        "#4f46e5",
                        "#06b6d4",
                        "#10b981",
                        "#f59e0b",
                        "#ef4444",
                        "#8b5cf6",
                        "#ec4899",
                        "#14b8a6",
                        "#f97316",
                        "#6366f1",
                      ];

                      const percentage =
                        categoryTotal > 0
                          ? (
                              (item.amount /
                                categoryTotal) *
                              100
                            ).toFixed(1)
                          : 0;

                      return (
                        <div
                          className="legend-item"
                          key={`${item.name}-${index}`}
                        >
                          <span
                            className="legend-color"
                            style={{
                              background:
                                colors[
                                  index %
                                    colors.length
                                ],
                            }}
                          />

                          <span className="legend-name">
                            {item.name}
                          </span>

                          <span className="legend-percentage">
                            {percentage}%
                          </span>

                          <strong>
                            {formatMoney(
                              item.amount
                            )}
                          </strong>
                        </div>
                      );
                    }
                  )}

                </div>

              </div>
            )}

          </div>
        )}

        {/* ===================================================
            BAR
        =================================================== */}

        {chartType === "bar" && (
          <div className="chart-content">

            {categories.length === 0 ? (
              <div className="empty-chart">
                <BarChart3 size={42} />

                <p>
                  No category expense data
                  available.
                </p>
              </div>
            ) : (
              <div className="bar-chart">

                {categories.map(
                  (item, index) => {
                    const percentage =
                      maxCategoryAmount > 0
                        ? (item.amount /
                            maxCategoryAmount) *
                          100
                        : 0;

                    return (
                      <div
                        className="bar-item"
                        key={`${item.name}-${index}`}
                      >

                        <div className="bar-label">
                          <span>
                            {item.name}
                          </span>

                          <strong>
                            {formatMoney(
                              item.amount
                            )}
                          </strong>
                        </div>

                        <div className="bar-track">

                          <div
                            className="bar-fill"
                            style={{
                              width: `${Math.max(
                                percentage,
                                1
                              )}%`,
                            }}
                          />

                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </div>
        )}

        {/* ===================================================
            LINE
        =================================================== */}

        {chartType === "line" && (
          <div className="chart-content">

            {months.length === 0 ? (
              <div className="empty-chart">
                <LineChart size={42} />

                <p>
                  No monthly expense data
                  available.
                </p>
              </div>
            ) : (
              <div className="line-chart-wrapper">

                <svg
                  viewBox="0 0 900 360"
                  className="line-chart"
                  preserveAspectRatio="none"
                >

                  {/* -----------------------------------------
                      HORIZONTAL GRID
                  ----------------------------------------- */}

                  {yAxisValues.map(
                    (value, index) => {
                      const y =
                        lineChart.paddingTop +
                        lineChart.chartHeight -
                        (value /
                          lineChart.maxValue) *
                          lineChart.chartHeight;

                      return (
                        <g key={index}>

                          <line
                            x1={
                              lineChart.paddingLeft
                            }
                            y1={y}
                            x2={
                              lineChart.width -
                              lineChart.paddingRight
                            }
                            y2={y}
                            className="chart-grid-line"
                          />

                          <text
                            x="10"
                            y={y + 4}
                            className="chart-axis-label"
                          >
                            ₹
                            {Math.round(
                              value
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </text>

                        </g>
                      );
                    }
                  )}

                  {/* -----------------------------------------
                      X AXIS
                  ----------------------------------------- */}

                  <line
                    x1={
                      lineChart.paddingLeft
                    }
                    y1={
                      lineChart.height -
                      lineChart.paddingBottom
                    }
                    x2={
                      lineChart.width -
                      lineChart.paddingRight
                    }
                    y2={
                      lineChart.height -
                      lineChart.paddingBottom
                    }
                    className="chart-axis-line"
                  />

                  {/* -----------------------------------------
                      AREA
                  ----------------------------------------- */}

                  {lineChart.points.length >
                    1 && (
                    <polygon
                      points={`
                        ${lineChart.paddingLeft},
                        ${
                          lineChart.height -
                          lineChart.paddingBottom
                        }
                        ${lineChart.polylinePoints}
                        ${
                          lineChart.width -
                          lineChart.paddingRight
                        },
                        ${
                          lineChart.height -
                          lineChart.paddingBottom
                        }
                      `}
                      className="line-area"
                    />
                  )}

                  {/* -----------------------------------------
                      LINE
                  ----------------------------------------- */}

                  {lineChart.points.length >
                    1 && (
                    <polyline
                      points={
                        lineChart.polylinePoints
                      }
                      className="line-path"
                    />
                  )}

                  {/* -----------------------------------------
                      POINTS
                  ----------------------------------------- */}

                  {lineChart.points.map(
                    (point, index) => (
                      <g key={index}>

                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="6"
                          className="line-point-outer"
                        />

                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="3"
                          className="line-point-inner"
                        />

                      </g>
                    )
                  )}

                </svg>

                {/* -----------------------------------------
                    MONTH LABELS
                ----------------------------------------- */}

                <div className="line-labels">

                  {months.map(
                    (item, index) => (
                      <span key={index}>
                        {item.label}
                      </span>
                    )
                  )}

                </div>

              </div>
            )}

          </div>
        )}

      </div>

      {/* =====================================================
          CATEGORY BREAKDOWN
      ===================================================== */}

      {categories.length > 0 && (
        <div className="analytics-table-card">

          <div className="table-header">

            <div>
              <h2>
                Category Breakdown
              </h2>

              <p>
                Your spending by category.
              </p>
            </div>

          </div>

          <div className="analytics-table-wrapper">

            <table className="analytics-table">

              <thead>
                <tr>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Percentage</th>
                </tr>
              </thead>

              <tbody>

                {categories.map(
                  (item, index) => {
                    const percentage =
                      categoryTotal > 0
                        ? (
                            (item.amount /
                              categoryTotal) *
                            100
                          ).toFixed(1)
                        : "0.0";

                    return (
                      <tr
                        key={`${item.name}-${index}`}
                      >

                        <td>
                          <div className="category-cell">
                            <span className="category-dot" />

                            {item.name}
                          </div>
                        </td>

                        <td>
                          {formatMoney(
                            item.amount
                          )}
                        </td>

                        <td>
                          {percentage}%
                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        </div>
      )}

    </div>
  );
}