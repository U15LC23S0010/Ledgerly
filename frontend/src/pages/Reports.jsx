import { useEffect, useMemo, useState } from "react";

import {
  FileText,
  TrendingUp,
  TrendingDown,
  Wallet,
  RefreshCw,
  Search,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import api from "../api/api";
import "./Reports.css";

export default function Reports() {
  const [expenses, setExpenses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // =========================================================
  // LOAD REPORT DATA
  // =========================================================

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      setLoading(true);
      setError("");

      const [
        expensesResponse,
        transactionsResponse,
        accountsResponse,
      ] = await Promise.all([
        api.get("/expenses/"),
        api.get("/transactions/"),
        api.get("/accounts/"),
      ]);

      console.log("EXPENSES:", expensesResponse.data);
      console.log("TRANSACTIONS:", transactionsResponse.data);
      console.log("ACCOUNTS:", accountsResponse.data);

      // -----------------------------------------------------
      // HANDLE DIFFERENT API RESPONSE SHAPES
      // -----------------------------------------------------

      const expensesData = Array.isArray(
        expensesResponse.data
      )
        ? expensesResponse.data
        : expensesResponse.data?.expenses || [];

      const transactionsData = Array.isArray(
        transactionsResponse.data
      )
        ? transactionsResponse.data
        : transactionsResponse.data?.transactions || [];

      const accountsData = Array.isArray(
        accountsResponse.data
      )
        ? accountsResponse.data
        : accountsResponse.data?.accounts || [];

      setExpenses(expensesData);
      setTransactions(transactionsData);
      setAccounts(accountsData);
    } catch (err) {
      console.error("Reports error:", err);

      setError(
        err.response?.data?.detail ||
          "Unable to load financial reports."
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // MONEY FORMAT
  // =========================================================

  function money(value) {
    return `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  // =========================================================
  // DATE FORMAT
  // =========================================================

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  // =========================================================
  // FINANCIAL REPORT CALCULATION
  // =========================================================

  const reportData = useMemo(() => {
    // -------------------------------------------------------
    // INCOME
    // -------------------------------------------------------

    const income = transactions
      .filter((transaction) => {
        const type = String(
          transaction.transaction_type || ""
        ).toLowerCase();

        return type === "income";
      })
      .reduce(
        (sum, transaction) =>
          sum + Number(transaction.amount || 0),
        0
      );

    // -------------------------------------------------------
    // EXPENSES
    // -------------------------------------------------------

    const totalExpenses = transactions
      .filter((transaction) => {
        const type = String(
          transaction.transaction_type || ""
        ).toLowerCase();

        return type === "expense";
      })
      .reduce(
        (sum, transaction) =>
          sum + Number(transaction.amount || 0),
        0
      );

    // -------------------------------------------------------
    // TRANSFERS
    //
    // Transfers are intentionally excluded from profit/loss.
    // Moving money between accounts is not income or expense.
    // -------------------------------------------------------

    const transfers = transactions
      .filter((transaction) => {
        const type = String(
          transaction.transaction_type || ""
        ).toLowerCase();

        return type === "transfer";
      })
      .reduce(
        (sum, transaction) =>
          sum + Number(transaction.amount || 0),
        0
      );

    // -------------------------------------------------------
    // NET RESULT
    // -------------------------------------------------------

    const netResult = income - totalExpenses;

    return {
      income,
      totalExpenses,
      transfers,
      netResult,
    };
  }, [transactions]);

  // =========================================================
  // CHART DATA
  // =========================================================

  const chartData = useMemo(() => {
    return [
      {
        name: "Financial Overview",
        Income: reportData.income,
        Expenses: reportData.totalExpenses,
      },
    ];
  }, [
    reportData.income,
    reportData.totalExpenses,
  ]);

  // =========================================================
  // FILTER TRANSACTIONS
  // =========================================================

  const filteredTransactions = transactions
    .filter((transaction) => {
      const query = search.trim().toLowerCase();

      if (!query) {
        return true;
      }

      return `
        ${transaction.description || ""}
        ${transaction.transaction_type || ""}
        ${transaction.date || ""}
      `
        .toLowerCase()
        .includes(query);
    })
    .slice(0, 8);

  // =========================================================
  // LOADING STATE
  // =========================================================

  if (loading) {
    return (
      <div className="reports-page">

        <div className="reports-loading">

          <div className="reports-spinner" />

          <h2>
            Loading reports...
          </h2>

          <p>
            Preparing your LedgerFlow financial reports.
          </p>

        </div>

      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="reports-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="reports-header">

        <div className="reports-heading">

          <div className="reports-icon">
            <FileText />
          </div>

          <div>

            <span className="reports-eyebrow">
              BUSINESS REPORTING
            </span>

            <h1>
              Reports
            </h1>

            <p>
              Review your financial reports and bookkeeping
              activity.
            </p>

          </div>

        </div>

        <button
          className="reports-refresh-button"
          onClick={loadReports}
        >
          <RefreshCw />

          Refresh
        </button>

      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="reports-error">
          {error}
        </div>
      )}

      {/* =====================================================
          FINANCIAL SUMMARY
      ===================================================== */}

      <section className="reports-summary">

        {/* TOTAL INCOME */}

        <div className="report-card">

          <div className="report-card-icon income">
            <TrendingUp />
          </div>

          <div>

            <span>
              Total income
            </span>

            <strong>
              {money(reportData.income)}
            </strong>

            <small>
              Recorded income transactions
            </small>

          </div>

        </div>

        {/* TOTAL EXPENSES */}

        <div className="report-card">

          <div className="report-card-icon expense">
            <TrendingDown />
          </div>

          <div>

            <span>
              Total expenses
            </span>

            <strong>
              {money(reportData.totalExpenses)}
            </strong>

            <small>
              Recorded business expenses
            </small>

          </div>

        </div>

        {/* NET RESULT */}

        <div className="report-card">

          <div className="report-card-icon result">
            <Wallet />
          </div>

          <div>

            <span>
              Net result
            </span>

            <strong
              className={
                reportData.netResult >= 0
                  ? "positive"
                  : "negative"
              }
            >
              {money(reportData.netResult)}
            </strong>

            <small>
              Income minus expenses
            </small>

          </div>

        </div>

        {/* ACCOUNTS */}

        <div className="report-card">

          <div className="report-card-icon accounts">
            <Wallet />
          </div>

          <div>

            <span>
              Accounts
            </span>

            <strong>
              {accounts.length}
            </strong>

            <small>
              Financial accounts
            </small>

          </div>

        </div>

      </section>

      {/* =====================================================
          REPORT GRID
      ===================================================== */}

      <div className="reports-grid">

        {/* ===================================================
            PROFIT & LOSS
        =================================================== */}

        <section className="reports-panel">

          <div className="reports-panel-header">

            <div>

              <span>
                FINANCIAL OVERVIEW
              </span>

              <h2>
                Profit & loss summary
              </h2>

            </div>

          </div>

          <div className="profit-summary">

            {/* INCOME */}

            <div className="profit-row">

              <div>
                <ArrowUpRight />

                <span>
                  Income
                </span>
              </div>

              <strong className="positive">
                {money(reportData.income)}
              </strong>

            </div>

            {/* EXPENSES */}

            <div className="profit-row">

              <div>
                <ArrowDownRight />

                <span>
                  Expenses
                </span>
              </div>

              <strong className="negative">
                {money(reportData.totalExpenses)}
              </strong>

            </div>

            <div className="profit-divider" />

            {/* NET RESULT */}

            <div className="profit-row total">

              <div>
                <Wallet />

                <span>
                  Net result
                </span>
              </div>

              <strong
                className={
                  reportData.netResult >= 0
                    ? "positive"
                    : "negative"
                }
              >
                {money(reportData.netResult)}
              </strong>

            </div>

          </div>

        </section>

        {/* ===================================================
            INCOME VS EXPENSES CHART
        =================================================== */}

        <section className="reports-panel reports-chart-panel">

          <div className="reports-panel-header">

            <div>

              <span>
                FINANCIAL COMPARISON
              </span>

              <h2>
                Income vs expenses
              </h2>

            </div>

          </div>

          <div className="reports-chart">

            <ResponsiveContainer
              width="100%"
              height={280}
            >

              <BarChart data={chartData}>

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="name"
                />

                <YAxis />

                <Tooltip
                  formatter={(value) =>
                    money(value)
                  }
                />

                <Legend />

                <Bar
                  dataKey="Income"
                  name="Income"
                  radius={[6, 6, 0, 0]}
                />

                <Bar
                  dataKey="Expenses"
                  name="Expenses"
                  radius={[6, 6, 0, 0]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </section>

        {/* ===================================================
            ACCOUNT BALANCES
        =================================================== */}

        <section className="reports-panel">

          <div className="reports-panel-header">

            <div>

              <span>
                ACCOUNTS
              </span>

              <h2>
                Account balances
              </h2>

            </div>

          </div>

          {accounts.length === 0 ? (

            <div className="report-empty-small">
              No accounts available.
            </div>

          ) : (

            <div className="account-report-list">

              {accounts
                .slice(0, 6)
                .map((account) => (

                  <div
                    className="account-report-row"
                    key={account.id}
                  >

                    <div>

                      <strong>
                        {account.name}
                      </strong>

                      <span>
                        {account.account_type}
                      </span>

                    </div>

                    <b>
                      {money(account.balance)}
                    </b>

                  </div>

                ))}

            </div>

          )}

        </section>

      </div>

      {/* =====================================================
          TRANSACTION REPORT
      ===================================================== */}

      <section className="reports-panel transaction-report">

        <div className="reports-panel-header">

          <div>

            <span>
              TRANSACTION REPORT
            </span>

            <h2>
              Recent financial activity
            </h2>

          </div>

          <div className="report-search">

            <Search />

            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

          </div>

        </div>

        {/* ===================================================
            NO TRANSACTIONS
        =================================================== */}

        {filteredTransactions.length === 0 ? (

          <div className="report-empty">

            <FileText />

            <h3>
              No transactions found
            </h3>

            <p>
              Your financial activity will appear here.
            </p>

          </div>

        ) : (

          <div className="report-table">

            {/* TABLE HEADER */}

            <div className="report-table-header">

              <span>
                Description
              </span>

              <span>
                Type
              </span>

              <span>
                Date
              </span>

              <span>
                Amount
              </span>

            </div>

            {/* TRANSACTIONS */}

            {filteredTransactions.map(
              (transaction) => {

                const type = String(
                  transaction.transaction_type || ""
                ).toLowerCase();

                const isIncome =
                  type === "income";

                const isTransfer =
                  type === "transfer";

                return (

                  <div
                    className="report-table-row"
                    key={transaction.id}
                  >

                    <strong>
                      {transaction.description || "—"}
                    </strong>

                    <span>

                      <em
                        className={`report-type ${type}`}
                      >
                        {transaction.transaction_type || "—"}
                      </em>

                    </span>

                    <span>
                      {formatDate(transaction.date)}
                    </span>

                    <b
                      className={
                        isTransfer
                          ? ""
                          : isIncome
                          ? "positive"
                          : "negative"
                      }
                    >

                      {isTransfer
                        ? ""
                        : isIncome
                        ? "+"
                        : "-"}

                      {money(transaction.amount)}

                    </b>

                  </div>

                );
              }
            )}

          </div>

        )}

      </section>

    </div>
  );
}