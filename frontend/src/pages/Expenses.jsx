import { useEffect, useState } from "react";
import {
  WalletCards,
  Plus,
  Search,
  Filter,
  Download,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";

import {
  getExpenses,
  searchExpenses,
  filterExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  exportExpensesCSV,
} from "../api/expensesApi";

import { getCategories } from "../api/categoriesApi";

import "./Expenses.css";

const SETTINGS_KEY = "ledgerly_settings";

const CURRENCY_CONFIG = {
  INR: {
    locale: "en-IN",
    currency: "INR",
    rate: 1,
    symbol: "₹",
  },

  USD: {
    locale: "en-US",
    currency: "USD",
    rate: 0.0118,
    symbol: "$",
  },

  EUR: {
    locale: "de-DE",
    currency: "EUR",
    rate: 0.0101,
    symbol: "€",
  },

  GBP: {
    locale: "en-GB",
    currency: "GBP",
    rate: 0.0087,
    symbol: "£",
  },
};

const DATE_FORMATS = [
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
];

export default function Expenses() {
  // =====================================================
  // STATE
  // =====================================================

  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [warning, setWarning] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // =====================================================
  // GLOBAL SETTINGS
  // =====================================================

  const [currency, setCurrency] = useState("INR");
  const [dateFormat, setDateFormat] =
    useState("DD/MM/YYYY");

  // =====================================================
  // SEARCH
  // =====================================================

  const [search, setSearch] = useState("");

  // =====================================================
  // FILTERS
  // =====================================================

  const [showFilters, setShowFilters] =
    useState(false);

  const [categoryFilter, setCategoryFilter] =
    useState("");

  const [minAmount, setMinAmount] =
    useState("");

  const [maxAmount, setMaxAmount] =
    useState("");

  // =====================================================
  // SORTING
  // =====================================================

  const [sortBy, setSortBy] =
    useState("date");

  const [order, setOrder] =
    useState("desc");

  // =====================================================
  // PAGINATION
  // =====================================================

  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // =====================================================
  // FORM
  // =====================================================

  const [form, setForm] = useState({
    title: "",
    amount: "",
    category_id: "",
    date: "",
  });

  // =====================================================
  // LOAD SETTINGS
  // =====================================================

  const loadSettings = () => {
    try {
      const stored =
        localStorage.getItem(SETTINGS_KEY);

      if (!stored) {
        setCurrency("INR");
        setDateFormat("DD/MM/YYYY");
        return;
      }

      const parsed = JSON.parse(stored);

      const selectedCurrency =
        CURRENCY_CONFIG[parsed?.currency]
          ? parsed.currency
          : "INR";

      const selectedDateFormat =
        DATE_FORMATS.includes(
          parsed?.dateFormat
        )
          ? parsed.dateFormat
          : "DD/MM/YYYY";

      setCurrency(selectedCurrency);
      setDateFormat(selectedDateFormat);
    } catch (err) {
      console.error(
        "Settings loading error:",
        err
      );

      setCurrency("INR");
      setDateFormat("DD/MM/YYYY");
    }
  };

  // =====================================================
  // SETTINGS LISTENER
  // =====================================================

  useEffect(() => {
    loadSettings();

    const handleSettingsUpdate = (event) => {
      const updated =
        event?.detail || {};

      const selectedCurrency =
        CURRENCY_CONFIG[updated.currency]
          ? updated.currency
          : "INR";

      const selectedDateFormat =
        DATE_FORMATS.includes(
          updated.dateFormat
        )
          ? updated.dateFormat
          : "DD/MM/YYYY";

      setCurrency(selectedCurrency);
      setDateFormat(selectedDateFormat);
    };

    window.addEventListener(
      "ledgerly-settings-updated",
      handleSettingsUpdate
    );

    return () => {
      window.removeEventListener(
        "ledgerly-settings-updated",
        handleSettingsUpdate
      );
    };
  }, []);

  // =====================================================
  // CURRENCY FORMATTER
  // =====================================================

  const formatCurrency = (value) => {
    const amount = Number(value || 0);

    const config =
      CURRENCY_CONFIG[currency] ||
      CURRENCY_CONFIG.INR;

    // Database values are INR.
    // Conversion is display-only.
    const convertedAmount =
      amount * config.rate;

    return new Intl.NumberFormat(
      config.locale,
      {
        style: "currency",
        currency: config.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    ).format(convertedAmount);
  };

  // =====================================================
  // DATE FORMATTER
  // =====================================================

  const formatDate = (value) => {
    if (!value) {
      return "—";
    }

    const stringValue = String(value);

    /*
     * Handle database date-only values directly.
     *
     * This avoids:
     * new Date("2026-08-24")
     *
     * which can introduce timezone problems.
     */

    const dateOnlyMatch =
      stringValue.match(
        /^(\d{4})-(\d{2})-(\d{2})/
      );

    if (dateOnlyMatch) {
      const year =
        dateOnlyMatch[1];

      const month =
        dateOnlyMatch[2];

      const day =
        dateOnlyMatch[3];

      if (dateFormat === "DD/MM/YYYY") {
        return `${day}/${month}/${year}`;
      }

      if (dateFormat === "MM/DD/YYYY") {
        return `${month}/${day}/${year}`;
      }

      if (dateFormat === "YYYY-MM-DD") {
        return `${year}-${month}-${day}`;
      }
    }

    /*
     * Fallback for full ISO timestamps.
     */

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return stringValue;
    }

    const day =
      String(parsed.getDate()).padStart(
        2,
        "0"
      );

    const month =
      String(
        parsed.getMonth() + 1
      ).padStart(2, "0");

    const year =
      parsed.getFullYear();

    if (dateFormat === "DD/MM/YYYY") {
      return `${day}/${month}/${year}`;
    }

    if (dateFormat === "MM/DD/YYYY") {
      return `${month}/${day}/${year}`;
    }

    if (dateFormat === "YYYY-MM-DD") {
      return `${year}-${month}-${day}`;
    }

    return `${day}/${month}/${year}`;
  };

  // =====================================================
  // GET TODAY
  // =====================================================

  const getToday = () => {
    const today = new Date();

    const year =
      today.getFullYear();

    const month =
      String(
        today.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        today.getDate()
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // =====================================================
  // LOAD CATEGORIES
  // =====================================================

  const loadCategories = async () => {
    try {
      const response =
        await getCategories();

      const data =
        response?.data;

      setCategories(
        Array.isArray(data)
          ? data
          : data?.categories || []
      );
    } catch (err) {
      console.error(
        "Category error:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          "Unable to load categories."
      );
    }
  };

  // =====================================================
  // LOAD EXPENSES
  // =====================================================

  const loadExpenses = async () => {
    setLoading(true);
    setError("");

    try {
      let response;

      // SEARCH
      if (search.trim()) {
        response =
          await searchExpenses(
            search.trim(),
            {
              sort_by: sortBy,
              order,
            }
          );
      }

      // FILTER
      else if (
        categoryFilter ||
        minAmount ||
        maxAmount
      ) {
        response =
          await filterExpenses({
            category_id:
              categoryFilter ||
              undefined,

            min_amount:
              minAmount ||
              undefined,

            max_amount:
              maxAmount ||
              undefined,

            sort_by: sortBy,
            order,
          });
      }

      // NORMAL LIST
      else {
        response =
          await getExpenses({
            page,
            limit,
            sort_by: sortBy,
            order,
          });
      }

      const data =
        response?.data;

      setExpenses(
        Array.isArray(data)
          ? data
          : data?.expenses || []
      );
    } catch (err) {
      console.error(
        "Expenses error:",
        err
      );

      if (
        err?.response?.status === 401
      ) {
        setError(
          "Your session has expired. Please log in again."
        );
      } else {
        setError(
          err?.response?.data?.detail ||
            err?.message ||
            "Unable to load expenses."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadCategories();
  }, []);

  // =====================================================
  // EXPENSE LOAD
  // =====================================================

  useEffect(() => {
    loadExpenses();
  }, [
    page,
    sortBy,
    order,
    search,
    categoryFilter,
    minAmount,
    maxAmount,
  ]);

  // =====================================================
  // RESET FORM
  // =====================================================

  const resetForm = () => {
    setForm({
      title: "",
      amount: "",
      category_id: "",
      date: getToday(),
    });

    setEditingExpense(null);
  };

  // =====================================================
  // OPEN ADD
  // =====================================================

  const openAddModal = () => {
    resetForm();

    setShowModal(true);
    setError("");
    setWarning("");
  };

  // =====================================================
  // OPEN EDIT
  // =====================================================

  const openEditModal = (expense) => {
    setEditingExpense(expense);

    let expenseDate = "";

    if (expense?.date) {
      const match =
        String(expense.date).match(
          /^(\d{4}-\d{2}-\d{2})/
        );

      expenseDate =
        match
          ? match[1]
          : "";
    }

    setForm({
      title:
        expense?.title || "",

      amount:
        expense?.amount ??
        "",

      category_id:
        expense?.category_id ??
        "",

      date: expenseDate,
    });

    setShowModal(true);
    setError("");
    setWarning("");
  };

  // =====================================================
  // CLOSE MODAL
  // =====================================================

  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);
    resetForm();
  };

  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =====================================================
  // SAVE EXPENSE
  // =====================================================

  const saveExpense = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");
    setWarning("");

    if (!form.title.trim()) {
      setError(
        "Please enter an expense title."
      );
      return;
    }

    if (
      !form.amount ||
      Number(form.amount) <= 0
    ) {
      setError(
        "Please enter a valid amount greater than 0."
      );
      return;
    }

    if (!form.category_id) {
      setError(
        "Please select a category."
      );
      return;
    }

    if (!form.date) {
      setError(
        "Please select a date."
      );
      return;
    }

    setSaving(true);

    try {
      /*
       * IMPORTANT:
       * Amount is always sent to backend in INR.
       * Currency conversion happens only for display.
       */

      const payload = {
        title:
          form.title.trim(),

        amount:
          Number(form.amount),

        category_id:
          Number(form.category_id),

        date:
          form.date,
      };

      let response;

      if (editingExpense) {
        response =
          await updateExpense(
            editingExpense.id,
            payload
          );
      } else {
        response =
          await createExpense(
            payload
          );
      }

      const data =
        response?.data || {};

      if (
        !editingExpense &&
        data?.warning
      ) {
        setWarning(
          data.warning
        );
      }

      setMessage(
        editingExpense
          ? "Expense updated successfully."
          : "Expense added successfully."
      );

      setShowModal(false);
      resetForm();

      await loadExpenses();
    } catch (err) {
      console.error(
        "Save expense error:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to save expense."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDeleteExpense =
    async (id) => {
      const confirmed =
        window.confirm(
          "Are you sure you want to delete this expense?"
        );

      if (!confirmed) {
        return;
      }

      setDeleting(true);
      setError("");
      setMessage("");

      try {
        await deleteExpense(id);

        setMessage(
          "Expense deleted successfully."
        );

        await loadExpenses();
      } catch (err) {
        console.error(
          "Delete expense error:",
          err
        );

        setError(
          err?.response?.data?.detail ||
            err?.message ||
            "Unable to delete expense."
        );
      } finally {
        setDeleting(false);
      }
    };

  // =====================================================
  // CLEAR FILTERS
  // =====================================================

  const clearFilters = () => {
    setCategoryFilter("");
    setMinAmount("");
    setMaxAmount("");
    setSearch("");
    setPage(1);
  };

  // =====================================================
  // SORT
  // =====================================================

  const changeSort = (value) => {
    setSortBy(value);
    setPage(1);
  };

  const toggleOrder = () => {
    setOrder((previous) =>
      previous === "asc"
        ? "desc"
        : "asc"
    );

    setPage(1);
  };

  // =====================================================
  // EXPORT CSV
  // =====================================================

  const exportCSV = async () => {
    try {
      setError("");

      const response =
        await exportExpensesCSV();

      const blob =
        response.data;

      const url =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement("a");

      link.href = url;
      link.download =
        "expenses.csv";

      document.body.appendChild(
        link
      );

      link.click();
      link.remove();

      window.URL.revokeObjectURL(
        url
      );

      setMessage(
        "Expenses exported successfully."
      );
    } catch (err) {
      console.error(
        "CSV export error:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to export expenses."
      );
    }
  };

  // =====================================================
  // HELPERS
  // =====================================================

  const getCategoryName = (
    categoryId
  ) => {
    const category =
      categories.find(
        (item) =>
          Number(item.id) ===
          Number(categoryId)
      );

    return (
      category?.name ||
      "Uncategorized"
    );
  };

  const totalDisplayed =
    expenses.reduce(
      (total, expense) =>
        total +
        Number(
          expense?.amount || 0
        ),
      0
    );

  const currencyConfig =
    CURRENCY_CONFIG[currency] ||
    CURRENCY_CONFIG.INR;

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="expenses-page">

      {/* HEADER */}

      <div className="expenses-header">

        <div className="expenses-title">

          <div className="expenses-icon">
            <WalletCards size={25} />
          </div>

          <div>
            <h1>Expenses</h1>

            <p>
              Record, categorize and manage
              your business expenses.
            </p>
          </div>

        </div>

        <div className="expenses-actions">

          <button
            className="secondary-expense-btn"
            onClick={exportCSV}
            type="button"
          >
            <Download size={16} />
            Export CSV
          </button>

          <button
            className="primary-expense-btn"
            onClick={openAddModal}
            type="button"
          >
            <Plus size={17} />
            Add Expense
          </button>

        </div>

      </div>

      {/* MESSAGES */}

      {message && (
        <div className="expense-message success">
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      {warning && (
        <div className="expense-message warning">
          <AlertTriangle size={18} />
          <span>{warning}</span>
        </div>
      )}

      {error && (
        <div className="expense-message error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* SUMMARY */}

      <div className="expense-summary">

        <div>
          <span>
            Displayed Expenses
          </span>

          <strong>
            {expenses.length}
          </strong>
        </div>

        <div>
          <span>
            Displayed Total
          </span>

          <strong>
            {formatCurrency(
              totalDisplayed
            )}
          </strong>
        </div>

        <div>
          <span>
            Currency
          </span>

          <strong>
            {currency}
          </strong>
        </div>

        <div>
          <span>
            Current Page
          </span>

          <strong>
            {page}
          </strong>
        </div>

      </div>

      {/* TOOLBAR */}

      <div className="expenses-toolbar">

        <div className="search-box">

          <Search size={17} />

          <input
            type="text"
            placeholder="Search expenses..."
            value={search}
            onChange={(event) => {
              setSearch(
                event.target.value
              );

              setPage(1);
            }}
          />

          {search && (
            <button
              onClick={() =>
                setSearch("")
              }
              type="button"
            >
              <X size={15} />
            </button>
          )}

        </div>

        <button
          className={
            showFilters
              ? "toolbar-btn active"
              : "toolbar-btn"
          }
          onClick={() =>
            setShowFilters(
              (value) => !value
            )
          }
          type="button"
        >
          <Filter size={16} />
          Filters
        </button>

        <select
          className="sort-select"
          value={sortBy}
          onChange={(event) =>
            changeSort(
              event.target.value
            )
          }
        >
          <option value="date">
            Sort by Date
          </option>

          <option value="amount">
            Sort by Amount
          </option>

          <option value="title">
            Sort by Title
          </option>
        </select>

        <button
          className="sort-order-btn"
          onClick={toggleOrder}
          type="button"
          title="Change sort order"
        >
          <ArrowUpDown size={16} />

          {order === "asc"
            ? "Ascending"
            : "Descending"}
        </button>

        <button
          className="toolbar-btn"
          onClick={loadExpenses}
          type="button"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>

      </div>

      {/* FILTERS */}

      {showFilters && (
        <div className="filters-panel">

          <div className="filter-field">

            <label>
              Category
            </label>

            <select
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(
                  event.target.value
                );

                setPage(1);
              }}
            >
              <option value="">
                All Categories
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                )
              )}

            </select>

          </div>

          <div className="filter-field">

            <label>
              Minimum Amount
            </label>

            <input
              type="number"
              min="0"
              placeholder="0"
              value={minAmount}
              onChange={(event) => {
                setMinAmount(
                  event.target.value
                );

                setPage(1);
              }}
            />

          </div>

          <div className="filter-field">

            <label>
              Maximum Amount
            </label>

            <input
              type="number"
              min="0"
              placeholder="0"
              value={maxAmount}
              onChange={(event) => {
                setMaxAmount(
                  event.target.value
                );

                setPage(1);
              }}
            />

          </div>

          <button
            className="clear-filter-btn"
            onClick={clearFilters}
            type="button"
          >
            <X size={15} />
            Clear Filters
          </button>

        </div>
      )}

      {/* TABLE */}

      <div className="expenses-card">

        {loading ? (
          <div className="expenses-loading">

            <RefreshCw
              size={28}
              className="expense-spinner"
            />

            <h3>
              Loading expenses...
            </h3>

            <p>
              Fetching your bookkeeping data.
            </p>

          </div>
        ) : expenses.length === 0 ? (
          <div className="expenses-empty">

            <div className="empty-icon">
              <WalletCards size={30} />
            </div>

            <h3>
              No expenses found
            </h3>

            <p>
              Start recording your business
              expenses to see them here.
            </p>

            <button
              className="primary-expense-btn"
              onClick={openAddModal}
              type="button"
            >
              <Plus size={17} />
              Add First Expense
            </button>

          </div>
        ) : (
          <div className="table-wrapper">

            <table className="expenses-table">

              <thead>
                <tr>
                  <th>Expense</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {expenses.map(
                  (expense) => (
                    <tr
                      key={expense.id}
                    >

                      <td>
                        <div className="expense-name">

                          <div className="expense-mini-icon">
                            <WalletCards size={16} />
                          </div>

                          <div>

                            <strong>
                              {expense.title}
                            </strong>

                            <span>
                              ID #{expense.id}
                            </span>

                          </div>

                        </div>
                      </td>

                      <td>
                        <span className="category-badge">
                          {getCategoryName(
                            expense.category_id
                          )}
                        </span>
                      </td>

                      <td>
                        <strong className="expense-amount">
                          {formatCurrency(
                            expense.amount
                          )}
                        </strong>
                      </td>

                      <td>
                        <span className="expense-date">
                          {formatDate(
                            expense.date
                          )}
                        </span>
                      </td>

                      <td>

                        <div className="row-actions">

                          <button
                            className="edit-btn"
                            onClick={() =>
                              openEditModal(
                                expense
                              )
                            }
                            title="Edit expense"
                            type="button"
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            className="delete-btn"
                            onClick={() =>
                              handleDeleteExpense(
                                expense.id
                              )
                            }
                            disabled={deleting}
                            title="Delete expense"
                            type="button"
                          >
                            <Trash2 size={15} />
                          </button>

                        </div>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* PAGINATION */}

      {!search &&
        !categoryFilter &&
        !minAmount &&
        !maxAmount &&
        expenses.length > 0 && (
          <div className="pagination">

            <button
              disabled={page === 1}
              onClick={() =>
                setPage(
                  (previous) =>
                    Math.max(
                      previous - 1,
                      1
                    )
                )
              }
              type="button"
            >
              <ChevronLeft size={17} />
              Previous
            </button>

            <span>
              Page {page}
            </span>

            <button
              disabled={
                expenses.length < limit
              }
              onClick={() =>
                setPage(
                  (previous) =>
                    previous + 1
                )
              }
              type="button"
            >
              Next
              <ChevronRight size={17} />
            </button>

          </div>
        )}

      {/* ADD / EDIT MODAL */}

      {showModal && (
        <div
          className="expense-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >

          <div className="expense-modal">

            <div className="modal-header">

              <div>

                <span className="modal-label">
                  {editingExpense
                    ? "UPDATE EXPENSE"
                    : "NEW TRANSACTION"}
                </span>

                <h2>
                  {editingExpense
                    ? "Edit Expense"
                    : "Add Expense"}
                </h2>

                <p>
                  Record a business expense
                  in your ledger.
                </p>

              </div>

              <button
                className="modal-close"
                onClick={closeModal}
                type="button"
              >
                <X size={19} />
              </button>

            </div>

            <form
              className="expense-form"
              onSubmit={saveExpense}
            >

              {/* TITLE */}

              <div className="form-group">

                <label>
                  Expense Title
                </label>

                <input
                  type="text"
                  name="title"
                  placeholder="e.g. Office supplies"
                  value={form.title}
                  onChange={handleChange}
                  maxLength={150}
                />

              </div>

              {/* AMOUNT */}

              <div className="form-group">

                <label>
                  Amount
                </label>

                <div className="form-amount">

                  <span>
                    {currencyConfig.symbol}
                  </span>

                  <input
                    type="number"
                    name="amount"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={handleChange}
                  />

                </div>

                <small>
                  Enter the original amount in
                  INR. Displayed values use your
                  selected currency.
                </small>

              </div>

              {/* CATEGORY */}

              <div className="form-group">

                <label>
                  Category
                </label>

                <select
                  name="category_id"
                  value={form.category_id}
                  onChange={handleChange}
                >
                  <option value="">
                    Select category
                  </option>

                  {categories.map(
                    (category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    )
                  )}

                </select>

              </div>

              {/* DATE */}

              <div className="form-group">

                <label>
                  Date
                </label>

                {/*
                 * Native date input intentionally
                 * remains YYYY-MM-DD because that
                 * is controlled by the browser.
                 */}

                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                />

                <small>
                  Display format:
                  {" "}
                  {dateFormat}
                </small>

              </div>

              {/* FORM ERROR */}

              {error && (
                <div className="expense-message error">
                  <AlertTriangle size={16} />

                  <span>
                    {error}
                  </span>
                </div>
              )}

              {/* ACTIONS */}

              <div className="form-actions">

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="submit-expense-btn"
                  disabled={saving}
                >

                  {saving ? (
                    <>
                      <RefreshCw
                        size={16}
                        className="expense-spinner"
                      />

                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />

                      {editingExpense
                        ? "Update Expense"
                        : "Save Expense"}
                    </>
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}