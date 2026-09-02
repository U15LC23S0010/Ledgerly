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

const SETTINGS_KEY = "ledgerly_settings";
const CURRENCY_KEY = "ledgerly_currency";

const DEFAULT_CURRENCY = "INR";

const VALID_CURRENCIES = [
  "INR",
  "USD",
  "EUR",
  "GBP",
];

const CURRENCY_RATES = {
  INR: 1,
  USD: 0.0117,
  EUR: 0.0100,
  GBP: 0.0087,
};

/* =========================================================
   CURRENCY LOCALES
   ========================================================= */

const CURRENCY_LOCALES = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
};

/* =========================================================
   CURRENCY SYMBOLS
   ========================================================= */

const CURRENCY_SYMBOLS = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

/* =========================================================
   GET STORED CURRENCY
   ========================================================= */

function getStoredCurrency() {
  try {

    const storedSettings =
      localStorage.getItem(SETTINGS_KEY);

    if (storedSettings) {
      const parsedSettings =
        JSON.parse(storedSettings);

      if (
        VALID_CURRENCIES.includes(
          parsedSettings?.currency
        )
      ) {
        return parsedSettings.currency;
      }
    }

    const storedCurrency =
      localStorage.getItem(CURRENCY_KEY);

    if (
      VALID_CURRENCIES.includes(storedCurrency)
    ) {
      return storedCurrency;
    }
  } catch (error) {
    console.error(
      "Unable to read currency settings:",
      error
    );
  }

  return DEFAULT_CURRENCY;
}

function convertFromINR(
  value,
  currency
) {
  const amount = Number(value) || 0;

  const rate =
    CURRENCY_RATES[currency] ??
    CURRENCY_RATES[DEFAULT_CURRENCY];

  return amount * rate;
}

/* =========================================================
   FORMAT MONEY
   ========================================================= */

function formatMoney(
  value,
  currency
) {
  const convertedValue =
    convertFromINR(
      value,
      currency
    );

  const locale =
    CURRENCY_LOCALES[currency] ||
    CURRENCY_LOCALES.INR;

  try {
    return new Intl.NumberFormat(
      locale,
      {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    ).format(convertedValue);
  } catch (error) {
    console.error(
      "Currency formatting error:",
      error
    );

    const symbol =
      CURRENCY_SYMBOLS[currency] ||
      CURRENCY_SYMBOLS.INR;

    return `${symbol}${convertedValue.toLocaleString(
      locale,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  }
}

/* =========================================================
   APPLICATION
   ========================================================= */

export default function Reports() {
  const [expenses, setExpenses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [currency, setCurrency] = useState(
    getStoredCurrency()
  );

  /* =======================================================
     LOAD REPORTS
     ======================================================= */

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

      console.log(
        "EXPENSES:",
        expensesResponse.data
      );

      console.log(
        "TRANSACTIONS:",
        transactionsResponse.data
      );

      console.log(
        "ACCOUNTS:",
        accountsResponse.data
      );

      /* -----------------------------------------------
         EXPENSES
         ----------------------------------------------- */

      const expensesData =
        Array.isArray(
          expensesResponse.data
        )
          ? expensesResponse.data
          : expensesResponse.data?.expenses ||
            [];

      /* -----------------------------------------------
         TRANSACTIONS
         ----------------------------------------------- */

      const transactionsData =
        Array.isArray(
          transactionsResponse.data
        )
          ? transactionsResponse.data
          : transactionsResponse.data
              ?.transactions || [];

      /* -----------------------------------------------
         ACCOUNTS
         ----------------------------------------------- */

      const accountsData =
        Array.isArray(
          accountsResponse.data
        )
          ? accountsResponse.data
          : accountsResponse.data?.accounts ||
            [];

      setExpenses(expensesData);
      setTransactions(transactionsData);
      setAccounts(accountsData);
    } catch (err) {
      console.error(
        "Reports error:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to load financial reports."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     LISTEN FOR CURRENCY CHANGES
     ======================================================= */

  useEffect(() => {
    const handleCurrencyChange = (
      event
    ) => {
      const newCurrency =
        event?.detail;

      if (
        VALID_CURRENCIES.includes(
          newCurrency
        )
      ) {
        setCurrency(newCurrency);
      } else {
        setCurrency(
          getStoredCurrency()
        );
      }
    };

    /* -----------------------------------------------
       SETTINGS UPDATED EVENT
       ----------------------------------------------- */

    const handleSettingsUpdate = (
      event
    ) => {
      const updatedCurrency =
        event?.detail?.currency;

      if (
        VALID_CURRENCIES.includes(
          updatedCurrency
        )
      ) {
        setCurrency(
          updatedCurrency
        );
      } else {
        setCurrency(
          getStoredCurrency()
        );
      }
    };

    window.addEventListener(
      "ledgerly-currency-changed",
      handleCurrencyChange
    );

    window.addEventListener(
      "ledgerly-settings-updated",
      handleSettingsUpdate
    );

    /* -----------------------------------------------
       STORAGE EVENT
       ----------------------------------------------- */

    const handleStorageChange = (
      event
    ) => {
      if (
        event.key === SETTINGS_KEY ||
        event.key === CURRENCY_KEY
      ) {
        setCurrency(
          getStoredCurrency()
        );
      }
    };

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    /* -----------------------------------------------
       VISIBILITY CHANGE
       ----------------------------------------------- */

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          setCurrency(
            getStoredCurrency()
          );
        }
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );


    return () => {
      window.removeEventListener(
        "ledgerly-currency-changed",
        handleCurrencyChange
      );

      window.removeEventListener(
        "ledgerly-settings-updated",
        handleSettingsUpdate
      );

      window.removeEventListener(
        "storage",
        handleStorageChange
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, []);


  function money(value) {
    return formatMoney(
      value,
      currency
    );
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  /* =======================================================
     FINANCIAL REPORT CALCULATION
     ======================================================= */

  const reportData = useMemo(() => {
    const income =
      transactions
        .filter((transaction) => {
          const type =
            String(
              transaction.transaction_type ||
                ""
            ).toLowerCase();

          return type === "income";
        })
        .reduce(
          (
            sum,
            transaction
          ) =>
            sum +
            Number(
              transaction.amount || 0
            ),
          0
        );

    /* -----------------------------------------------
       EXPENSES
       ----------------------------------------------- */

    const totalExpenses =
      transactions
        .filter((transaction) => {
          const type =
            String(
              transaction.transaction_type ||
                ""
            ).toLowerCase();

          return type === "expense";
        })
        .reduce(
          (
            sum,
            transaction
          ) =>
            sum +
            Number(
              transaction.amount || 0
            ),
          0
        );

    /* -----------------------------------------------
       TRANSFERS
       ----------------------------------------------- */

    const transfers =
      transactions
        .filter((transaction) => {
          const type =
            String(
              transaction.transaction_type ||
                ""
            ).toLowerCase();

          return type === "transfer";
        })
        .reduce(
          (
            sum,
            transaction
          ) =>
            sum +
            Number(
              transaction.amount || 0
            ),
          0
        );

    const netResult =
      income -
      totalExpenses;

    return {
      income,
      totalExpenses,
      transfers,
      netResult,
    };
  }, [transactions]);

  const chartData =
    useMemo(() => {
      return [
        {
          name:
            "Financial Overview",

          Income:
            convertFromINR(
              reportData.income,
              currency
            ),

          Expenses:
            convertFromINR(
              reportData.totalExpenses,
              currency
            ),
        },
      ];
    }, [
      reportData.income,
      reportData.totalExpenses,
      currency,
    ]);

  /* =======================================================
     FILTER TRANSACTIONS
     ======================================================= */

  const filteredTransactions =
    transactions
      .filter((transaction) => {
        const query =
          search
            .trim()
            .toLowerCase();

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

  /* =======================================================
     LOADING
     ======================================================= */

  if (loading) {
    return (
      <div className="reports-page">
        <div className="reports-loading">

          <div className="reports-spinner" />

          <h2>
            Loading reports...
          </h2>

          <p>
            Preparing your Ledgerly
            financial reports.
          </p>

        </div>
      </div>
    );
  }

  return (
    <div className="reports-page">

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
              Review your financial reports
              and bookkeeping activity.
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


      {error && (
        <div className="reports-error">
          {error}
        </div>
      )}

      {/* =================================================
          FINANCIAL SUMMARY
          ================================================= */}

      <section className="reports-summary">

        {/* INCOME */}

        <div className="report-card">

          <div className="report-card-icon income">
            <TrendingUp />
          </div>

          <div>

            <span>
              Total income
            </span>

            <strong>
              {money(
                reportData.income
              )}
            </strong>

            <small>
              Recorded income
              transactions
            </small>

          </div>

        </div>

        {/* EXPENSES */}

        <div className="report-card">

          <div className="report-card-icon expense">
            <TrendingDown />
          </div>

          <div>

            <span>
              Total expenses
            </span>

            <strong>
              {money(
                reportData.totalExpenses
              )}
            </strong>

            <small>
              Recorded business
              expenses
            </small>

          </div>

        </div>

        {/* NET */}

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
                reportData.netResult >=
                0
                  ? "positive"
                  : "negative"
              }
            >
              {money(
                reportData.netResult
              )}
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

      <div className="reports-grid">

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
                {money(
                  reportData.income
                )}
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
                {money(
                  reportData.totalExpenses
                )}
              </strong>

            </div>

            <div className="profit-divider" />

            {/* NET */}

            <div className="profit-row total">

              <div>
                <Wallet />

                <span>
                  Net result
                </span>
              </div>

              <strong
                className={
                  reportData.netResult >=
                  0
                    ? "positive"
                    : "negative"
                }
              >
                {money(
                  reportData.netResult
                )}
              </strong>

            </div>

          </div>

        </section>

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

              <BarChart
                data={chartData}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="name"
                />

                <YAxis
                  tickFormatter={(value) =>
                    formatMoney(
                      value /
                        CURRENCY_RATES[
                          currency
                        ],
                      currency
                    )
                  }
                />

                <Tooltip
                  formatter={(value) =>
                    formatMoney(
                      Number(value) /
                        CURRENCY_RATES[
                          currency
                        ],
                      currency
                    )
                  }
                />

                <Legend />

                <Bar
                  dataKey="Income"
                  name={`Income (${currency})`}
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />

                <Bar
                  dataKey="Expenses"
                  name={`Expenses (${currency})`}
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </section>

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
                .map(
                  (account) => (

                    <div
                      className="account-report-row"
                      key={
                        account.id
                      }
                    >

                      <div>

                        <strong>
                          {account.name}
                        </strong>

                        <span>
                          {
                            account.account_type
                          }
                        </span>

                      </div>

                      <b>
                        {money(
                          account.balance
                        )}
                      </b>

                    </div>

                  )
                )}

            </div>

          )}

        </section>

      </div>

      {/* =================================================
          TRANSACTION REPORT
          ================================================= */}

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
                setSearch(
                  e.target.value
                )
              }
            />

          </div>

        </div>

        {/* =================================================
            TRANSACTIONS
            ================================================= */}

        {filteredTransactions.length ===
        0 ? (

          <div className="report-empty">

            <FileText />

            <h3>
              No transactions found
            </h3>

            <p>
              Your financial activity
              will appear here.
            </p>

          </div>

        ) : (

          <div className="report-table">

            {/* HEADER */}

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

            {/* ROWS */}

            {filteredTransactions.map(
              (transaction) => {

                const type =
                  String(
                    transaction.transaction_type ||
                      ""
                  ).toLowerCase();

                const isIncome =
                  type === "income";

                const isTransfer =
                  type === "transfer";

                return (

                  <div
                    className="report-table-row"
                    key={
                      transaction.id
                    }
                  >

                    <strong>
                      {
                        transaction.description ||
                        "—"
                      }
                    </strong>

                    <span>

                      <em
                        className={`report-type ${type}`}
                      >
                        {
                          transaction.transaction_type ||
                          "—"
                        }
                      </em>

                    </span>

                    <span>
                      {formatDate(
                        transaction.date
                      )}
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

                      {!isTransfer &&
                        (isIncome
                          ? "+"
                          : "-")}

                      {money(
                        transaction.amount
                      )}

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