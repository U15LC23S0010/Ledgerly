import {
  useEffect,
  useMemo,
  useState,
} from "react";

import "./Budget.css";

import {
  getBudgetHistory,
  setBudget,
  deleteBudget,
} from "../api/budget";

import {
  formatCurrency,
  getCurrency,
  getCurrencySymbol,
} from "../utils/currency";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function Budget() {
  const today = new Date();

  const [selectedMonth, setSelectedMonth] =
    useState(today.getMonth() + 1);

  const [selectedYear, setSelectedYear] =
    useState(today.getFullYear());

  const [history, setHistory] = useState([]);

  const [budgetAmount, setBudgetAmount] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  /*
   * IMPORTANT:
   * Currency comes from Settings.
   */
  const [currency, setCurrency] =
    useState(getCurrency());

  /*
   * =====================================================
   * CURRENCY LISTENER
   * =====================================================
   */

  useEffect(() => {
    const updateCurrency = () => {
      setCurrency(getCurrency());
    };

    window.addEventListener(
      "ledgerly-currency-changed",
      updateCurrency
    );

    window.addEventListener(
      "ledgerly-settings-updated",
      updateCurrency
    );

    window.addEventListener(
      "storage",
      updateCurrency
    );

    return () => {
      window.removeEventListener(
        "ledgerly-currency-changed",
        updateCurrency
      );

      window.removeEventListener(
        "ledgerly-settings-updated",
        updateCurrency
      );

      window.removeEventListener(
        "storage",
        updateCurrency
      );
    };
  }, []);

  /*
   * =====================================================
   * LOAD BUDGET HISTORY
   * =====================================================
   */

  const loadBudgetHistory = async () => {
    setLoading(true);
    setError("");

    try {
      const response =
        await getBudgetHistory();

      const data = response.data;

      console.log(
        "BUDGET HISTORY:",
        data
      );

      if (data?.success) {
        setHistory(
          Array.isArray(data.history)
            ? data.history
            : []
        );
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error(
        "Budget history error:",
        err
      );

      setHistory([]);

      setError(
        `Unable to load budget: ${
          err.response?.data?.detail ||
          err.message ||
          "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * =====================================================
   * LOAD ON PAGE OPEN
   * =====================================================
   */

  useEffect(() => {
    loadBudgetHistory();
  }, []);

  /*
   * =====================================================
   * SELECTED BUDGET
   * =====================================================
   */

  const selectedBudget = useMemo(() => {
    return history.find(
      (item) =>
        Number(item.month) ===
          Number(selectedMonth) &&
        Number(item.year) ===
          Number(selectedYear)
    );
  }, [
    history,
    selectedMonth,
    selectedYear,
  ]);

  /*
   * =====================================================
   * UPDATE INPUT
   * =====================================================
   */

  useEffect(() => {
    if (selectedBudget) {
      setBudgetAmount(
        selectedBudget.monthly_budget
      );
    } else {
      setBudgetAmount("");
    }

    setSuccess("");
  }, [
    selectedBudget,
    selectedMonth,
    selectedYear,
  ]);

  /*
   * =====================================================
   * VALUES
   * =====================================================
   */

  const budget = Number(
    selectedBudget?.monthly_budget || 0
  );

  const spent = Number(
    selectedBudget?.spent || 0
  );

  const remaining = Number(
    selectedBudget?.remaining || 0
  );

  const usedPercentage = Number(
    selectedBudget?.used_percentage || 0
  );

  /*
   * =====================================================
   * STATUS
   * =====================================================
   */

  const getStatus = () => {
    if (!selectedBudget) {
      return {
        text: "Not Set",
        className: "not-set",
      };
    }

    if (usedPercentage >= 100) {
      return {
        text: "Over Budget",
        className: "over-budget",
      };
    }

    if (usedPercentage >= 90) {
      return {
        text: "Critical",
        className: "critical",
      };
    }

    if (usedPercentage >= 70) {
      return {
        text: "Warning",
        className: "warning",
      };
    }

    return {
      text: "On Track",
      className: "normal",
    };
  };

  const status = getStatus();

  /*
   * =====================================================
   * SET / UPDATE BUDGET
   * =====================================================
   */

  const handleSetBudget = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const amount =
      Number(budgetAmount);

    if (
      !budgetAmount ||
      amount <= 0
    ) {
      setError(
        "Please enter a valid budget amount."
      );
      return;
    }

    setSaving(true);

    try {
      const response =
        await setBudget({
          monthly_budget: amount,
          month: Number(
            selectedMonth
          ),
          year: Number(
            selectedYear
          ),
        });

      const data = response.data;

      console.log(
        "SET BUDGET RESPONSE:",
        data
      );

      if (!data?.success) {
        throw new Error(
          data?.message ||
            "Unable to save budget."
        );
      }

      setSuccess(
        `${MONTHS[selectedMonth - 1]} ${selectedYear} budget saved successfully.`
      );

      await loadBudgetHistory();
    } catch (err) {
      console.error(
        "Set budget error:",
        err
      );

      setError(
        `Unable to save budget: ${
          err.response?.data?.detail ||
          err.message ||
          "Unknown error"
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * =====================================================
   * DELETE BUDGET
   * =====================================================
   */

  const handleDeleteBudget = async () => {
    const isCurrentMonth =
      Number(selectedMonth) ===
        today.getMonth() + 1 &&
      Number(selectedYear) ===
        today.getFullYear();

    if (!isCurrentMonth) {
      setError(
        "Only the current month's budget can be deleted."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this budget?"
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response =
        await deleteBudget();

      const data = response.data;

      console.log(
        "DELETE BUDGET RESPONSE:",
        data
      );

      if (!data?.success) {
        throw new Error(
          data?.message ||
            "Unable to delete budget."
        );
      }

      setSuccess(
        "Budget deleted successfully."
      );

      await loadBudgetHistory();
    } catch (err) {
      console.error(
        "Delete budget error:",
        err
      );

      setError(
        `Unable to delete budget: ${
          err.response?.data?.detail ||
          err.message ||
          "Unknown error"
        }`
      );
    }
  };

  /*
   * =====================================================
   * YEAR OPTIONS
   * =====================================================
   */

  const years = [];

  for (
    let year =
      today.getFullYear() - 2;
    year <=
    today.getFullYear() + 2;
    year++
  ) {
    years.push(year);
  }

  /*
   * =====================================================
   * CURRENCY SYMBOL
   * =====================================================
   */

  const currencySymbol =
    getCurrencySymbol(currency);

  /*
   * =====================================================
   * RENDER
   * =====================================================
   */

  return (
    <div className="budget-page">

      {/* HEADER */}

      <div className="budget-page-header">

        <div>
          <h1>Budget</h1>

          <p>
            Set and manage your monthly
            spending budget.
          </p>
        </div>

        <div className="budget-period-selectors">

          <select
            value={selectedMonth}
            onChange={(e) =>
              setSelectedMonth(
                Number(e.target.value)
              )
            }
          >
            {MONTHS.map(
              (month, index) => (
                <option
                  key={month}
                  value={index + 1}
                >
                  {month}
                </option>
              )
            )}
          </select>

          <select
            value={selectedYear}
            onChange={(e) =>
              setSelectedYear(
                Number(e.target.value)
              )
            }
          >
            {years.map((year) => (
              <option
                key={year}
                value={year}
              >
                {year}
              </option>
            ))}
          </select>

        </div>

      </div>

      {/* ERROR */}

      {error && (
        <div className="budget-alert budget-alert-error">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* SUCCESS */}

      {success && (
        <div className="budget-alert budget-alert-success">
          <span>✓</span>
          <span>{success}</span>
        </div>
      )}

      {/* MAIN GRID */}

      <div className="budget-main-grid">

        {/* SET BUDGET */}

        <div className="budget-card set-budget-card">

          <div className="budget-card-header">

            <div>
              <h2>Set Budget</h2>

              <p>
                {
                  MONTHS[
                    selectedMonth - 1
                  ]
                }{" "}
                {selectedYear}
              </p>
            </div>

            <div className="budget-icon">
              {currencySymbol}
            </div>

          </div>

          <form
            onSubmit={handleSetBudget}
          >

            <label htmlFor="budgetAmount">
              Monthly Budget
            </label>

            <div className="budget-input-wrapper">

              <span className="currency-symbol">
                {currencySymbol}
              </span>

              <input
                id="budgetAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter budget amount"
                value={budgetAmount}
                onChange={(e) =>
                  setBudgetAmount(
                    e.target.value
                  )
                }
              />

            </div>

            <button
              type="submit"
              className="set-budget-button"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : selectedBudget
                ? "Update Budget"
                : "Set Budget"}
            </button>

          </form>

          {selectedBudget && (
            <button
              type="button"
              className="delete-budget-button"
              onClick={
                handleDeleteBudget
              }
            >
              Delete Current Month Budget
            </button>
          )}

        </div>

        {/* SUMMARY */}

        <div className="budget-card budget-summary-card">

          {loading ? (

            <div className="budget-loading">
              <div className="loading-spinner"></div>
              <p>
                Loading budget...
              </p>
            </div>

          ) : selectedBudget ? (

            <>

              <div className="budget-summary-top">

                <div>

                  <div className="summary-title-row">

                    <h2>
                      Budget Summary
                    </h2>

                    <span
                      className={`budget-status ${status.className}`}
                    >
                      {status.text}
                    </span>

                  </div>

                  <p>
                    {
                      MONTHS[
                        selectedMonth - 1
                      ]
                    }{" "}
                    {selectedYear}
                  </p>

                </div>

                <div className="summary-icon">
                  {currencySymbol}
                </div>

              </div>

              <div className="budget-summary-content">

                <div className="summary-big-value">
                  {formatCurrency(
                    budget,
                    currency
                  )}
                </div>

                <p className="summary-label">
                  Monthly Budget
                </p>

                <div className="budget-progress-container">

                  <div className="budget-progress-header">

                    <span>
                      Budget Used
                    </span>

                    <strong>
                      {usedPercentage.toFixed(
                        1
                      )}
                      %
                    </strong>

                  </div>

                  <div className="budget-progress-bar">

                    <div
                      className={`budget-progress-fill ${status.className}`}
                      style={{
                        width: `${Math.min(
                          usedPercentage,
                          100
                        )}%`,
                      }}
                    />

                  </div>

                </div>

                <div className="summary-stats">

                  <div className="summary-stat">

                    <span>
                      Spent
                    </span>

                    <strong>
                      {formatCurrency(
                        spent,
                        currency
                      )}
                    </strong>

                  </div>

                  <div className="summary-stat">

                    <span>
                      Remaining
                    </span>

                    <strong
                      className={
                        remaining < 0
                          ? "negative"
                          : "positive"
                      }
                    >
                      {formatCurrency(
                        remaining,
                        currency
                      )}
                    </strong>

                  </div>

                </div>

              </div>

            </>

          ) : (

            <div className="no-budget">

              <div className="no-budget-icon">
                {currencySymbol}
              </div>

              <span className="budget-status not-set">
                Not Set
              </span>

              <h2>
                No Budget Set
              </h2>

              <p>
                Set a budget for{" "}
                {
                  MONTHS[
                    selectedMonth - 1
                  ]
                }{" "}
                {selectedYear} to start
                tracking your spending.
              </p>

            </div>

          )}

        </div>

      </div>

      {/* HISTORY */}

      <div className="budget-card history-card">

        <div className="history-header">

          <div>

            <h2>
              Budget History
            </h2>

            <p>
              Your monthly budgets and
              spending history.
            </p>

          </div>

          <span className="history-count">
            {history.length}{" "}
            {history.length === 1
              ? "Month"
              : "Months"}
          </span>

        </div>

        {loading ? (

          <div className="history-loading">
            Loading history...
          </div>

        ) : history.length === 0 ? (

          <div className="empty-history">

            <div className="empty-history-icon">
              {currencySymbol}
            </div>

            <h3>
              No Budget History
            </h3>

            <p>
              Your saved monthly budgets
              will appear here.
            </p>

          </div>

        ) : (

          <div className="history-table-wrapper">

            <table className="history-table">

              <thead>

                <tr>
                  <th>Month</th>
                  <th>Budget</th>
                  <th>Spent</th>
                  <th>Remaining</th>
                  <th>Used</th>
                  <th>Status</th>
                </tr>

              </thead>

              <tbody>

                {history.map(
                  (item) => (

                    <tr
                      key={item.id}
                      className={
                        Number(
                          item.month
                        ) ===
                          Number(
                            selectedMonth
                          ) &&
                        Number(
                          item.year
                        ) ===
                          Number(
                            selectedYear
                          )
                          ? "selected-history-row"
                          : ""
                      }
                    >

                      <td>
                        <strong>
                          {
                            MONTHS[
                              Number(
                                item.month
                              ) - 1
                            ]
                          }{" "}
                          {item.year}
                        </strong>
                      </td>

                      <td>
                        {formatCurrency(
                          Number(
                            item.monthly_budget ||
                              0
                          ),
                          currency
                        )}
                      </td>

                      <td>
                        {formatCurrency(
                          Number(
                            item.spent || 0
                          ),
                          currency
                        )}
                      </td>

                      <td
                        className={
                          Number(
                            item.remaining
                          ) < 0
                            ? "negative"
                            : "positive"
                        }
                      >
                        {formatCurrency(
                          Number(
                            item.remaining ||
                              0
                          ),
                          currency
                        )}
                      </td>

                      <td>
                        {Number(
                          item.used_percentage ||
                            0
                        ).toFixed(1)}
                        %
                      </td>

                      <td>

                        <span
                          className={`history-status ${
                            item.status ||
                            "normal"
                          }`}
                        >
                          {item.status ===
                          "over_budget"
                            ? "Over Budget"
                            : item.status ===
                              "critical"
                            ? "Critical"
                            : item.status ===
                              "warning"
                            ? "Warning"
                            : "Normal"}
                        </span>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
}