import { useEffect, useState } from "react";

import {
  Edit,
  ArrowLeftRight,
  Plus,
  Search,
  Trash2,
  X,
  Wallet,
  CheckSquare,
  Square,
} from "lucide-react";

import "./Transactions.css";

import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  bulkDeleteTransactions,
} from "../api/transactionsApi";

import {
  getCategories,
} from "../api/categoriesApi";

import {
  getAccounts,
} from "../api/accountsApi";

export default function Transactions() {

  const today =
    new Date()
      .toISOString()
      .split("T")[0];


  // =========================================================
  // STATE
  // =========================================================

  const [transactions, setTransactions] =
    useState([]);

  const [editingTransaction, setEditingTransaction] =
    useState(null);

  const [categories, setCategories] =
  useState([]);

  const [accounts, setAccounts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [bulkDeleting, setBulkDeleting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [typeFilter, setTypeFilter] =
    useState("all");

  const [showModal, setShowModal] =
    useState(false);

  const [selectedTransactions, setSelectedTransactions] =
    useState([]);


  // =========================================================
  // FORM
  // =========================================================

  const [form, setForm] = useState({

    description: "",

    amount: "",

    transaction_type: "expense",

    date: today,

    account_id: "",

    destination_account_id: "",

    category_id: null,

  });


  // =========================================================
  // ERROR MESSAGE
  // =========================================================

  function getErrorMessage(
    err,
    fallback
  ) {

    const detail =
      err?.response?.data?.detail;


    if (Array.isArray(detail)) {

      return detail
        .map((item) => {

          if (
            typeof item === "string"
          ) {
            return item;
          }

          if (item?.msg) {

            const field =
              Array.isArray(item.loc)
                ? item.loc[
                    item.loc.length - 1
                  ]
                : "";

            return field
              ? `${field}: ${item.msg}`
              : item.msg;
          }

          return "";

        })
        .filter(Boolean)
        .join(", ");
    }


    if (
      typeof detail === "string"
    ) {

      return detail;
    }


    return fallback;
  }


 // =========================================================
// LOAD TRANSACTIONS
// =========================================================

async function loadTransactions() {
  try {
    setLoading(true);

    const response = await getTransactions();

    console.log(
      "Transactions API Response:",
      response.data
    );

    // Backend response:
    //
    // {
    //   transactions: [...],
    //   pagination: {...}
    // }

    setTransactions(
      Array.isArray(response.data?.transactions)
        ? response.data.transactions
        : []
    );

    setSelectedTransactions([]);

    setError("");

  } catch (err) {
    console.error(
      "Load transactions error:",
      err
    );

    setError(
      getErrorMessage(
        err,
        "Unable to load transactions."
      )
    );

  } finally {
    setLoading(false);
  }
}

  // =========================================================
  // LOAD ACCOUNTS
  // =========================================================

  async function loadAccounts() {

    try {

      const response =
        await getAccounts();

      setAccounts(
        Array.isArray(
          response.data
        )
          ? response.data
          : []
      );

    } catch (err) {

      console.error(
        "Load accounts error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to load accounts."
        )
      );
    }
  }

  async function loadCategories() {
  try {
    const response =
      await getCategories();

    setCategories(
      Array.isArray(response.data)
        ? response.data
        : []
    );
  } catch (err) {
    console.error(
      "Load categories error:",
      err
    );

    setError(
      getErrorMessage(
        err,
        "Unable to load categories."
      )
    );
  }
}



  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {

    loadTransactions();

    loadAccounts();

    loadCategories();

  }, []);


  // =========================================================
  // OPEN ADD MODAL
  // =========================================================

  function openAddModal() {

    setError("");

    setSuccess("");

    setEditingTransaction(null);

    setForm({

      description: "",

      amount: "",

      transaction_type:
        "expense",

      date: today,

      account_id:
        accounts.length
          ? String(
              accounts[0].id
            )
          : "",

      destination_account_id:
        "",

      category_id:
        null,

    });

    setShowModal(true);
  }


  // =========================================================
  // OPEN EDIT MODAL
  // =========================================================

  function openEditModal(
    transaction
  ) {

    setError("");

    setSuccess("");

    setEditingTransaction(
      transaction
    );

    setForm({

      description:
        transaction.description ||
        "",

      amount:
        transaction.amount ??
        "",

      transaction_type:
        transaction.transaction_type ||
        "expense",

      date:
        transaction.date ||
        today,

      account_id:
        transaction.account_id
          ? String(
              transaction.account_id
            )
          : "",

      destination_account_id:
        transaction.destination_account_id
          ? String(
              transaction.destination_account_id
            )
          : "",

      category_id:
        transaction.category_id ||
        null,

    });

    setShowModal(true);
  }


  // =========================================================
  // CLOSE MODAL
  // =========================================================

  function closeModal() {

    if (saving) {
      return;
    }

    setShowModal(false);

    setEditingTransaction(null);

    setError("");
  }


  // =========================================================
  // FORM CHANGE
  // =========================================================

  function handleChange(event) {

    const {
      name,
      value,
    } = event.target;


    setForm(
      (previous) => ({

        ...previous,

        [name]: value,

        ...(name ===
          "transaction_type" &&
        value !== "transfer"
          ? {
              destination_account_id:
                "",
            }
          : {}),

      })
    );

    setError("");
  }


  // =========================================================
  // CREATE / UPDATE
  // =========================================================

  async function handleSubmit(
    event
  ) {

    event.preventDefault();

    setError("");

    setSuccess("");


    const description =
      form.description.trim();

    const amount =
      Number(form.amount);

    const accountId =
      Number(form.account_id);

    const destinationAccountId =
      form.destination_account_id
        ? Number(
            form.destination_account_id
          )
        : null;


    if (!description) {

      setError(
        "Description is required."
      );

      return;
    }


    if (
      description.length < 2
    ) {

      setError(
        "Description must contain at least 2 characters."
      );

      return;
    }


    if (
      !form.amount ||
      Number.isNaN(amount) ||
      amount <= 0
    ) {

      setError(
        "Amount must be greater than 0."
      );

      return;
    }


    if (!form.date) {

      setError(
        "Date is required."
      );

      return;
    }


    if (
      !form.account_id ||
      Number.isNaN(accountId)
    ) {

      setError(
        "Please select an account."
      );

      return;
    }


    if (
      form.transaction_type ===
      "transfer"
    ) {

      if (
        !form.destination_account_id ||
        Number.isNaN(
          destinationAccountId
        )
      ) {

        setError(
          "Please select a destination account."
        );

        return;
      }


      if (
        accountId ===
        destinationAccountId
      ) {

        setError(
          "Source and destination accounts must be different."
        );

        return;
      }
    }


    try {

      setSaving(true);


      const payload = {

        description,

        amount,

        transaction_type:
          form.transaction_type,

        date:
          form.date,

        account_id:
          accountId,

        destination_account_id:
          form.transaction_type ===
          "transfer"
            ? destinationAccountId
            : null,

        category_id:
          form.category_id || null,

      };


     if (editingTransaction) {

  await updateTransaction(
    editingTransaction.id,
    payload
  );

} else {

  await createTransaction(
    payload
  );
}

      setShowModal(false);

      setSuccess(

        editingTransaction
          ? "Transaction updated successfully."
          : "Transaction created successfully."

      );

      setEditingTransaction(null);


      await loadTransactions();

      await loadAccounts();


    } catch (err) {

      console.error(
        "Save transaction error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to save transaction."
        )
      );

    } finally {

      setSaving(false);
    }
  }


  // =========================================================
  // SINGLE DELETE
  // =========================================================

  async function handleDelete(
    transaction
  ) {

    const confirmed =
      window.confirm(

        `Delete "${transaction.description}"?\n\nThis action cannot be undone.`
      );


    if (!confirmed) {
      return;
    }


    try {

      setError("");

      setSuccess("");


      await deleteTransaction(
        transaction.id
      );


      setTransactions(
        (previous) =>

          previous.filter(
            (item) =>
              item.id !==
              transaction.id
          )
      );


      setSelectedTransactions(
        (previous) =>

          previous.filter(
            (id) =>
              id !==
              transaction.id
          )
      );


      await loadAccounts();


      setSuccess(
        "Transaction deleted successfully."
      );


    } catch (err) {

      console.error(
        "Delete transaction error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to delete transaction."
        )
      );
    }
  }

  // =========================================================
  // FILTERED TRANSACTIONS
  // =========================================================

  const filteredTransactions =
    transactions.filter(
      (transaction) => {

        const query =
          search
            .trim()
            .toLowerCase();


        const searchableText = [

          transaction.description,

          transaction.transaction_type,

          transaction.account_name,

          transaction.category_name,

          transaction.date,

          transaction.amount,

        ]
          .filter(
            (value) =>
              value !== null &&
              value !== undefined
          )
          .join(" ")
          .toLowerCase();


        const matchesSearch =
          !query ||
          searchableText.includes(
            query
          );


        const matchesType =
          typeFilter === "all" ||
          transaction.transaction_type ===
            typeFilter;


        return (
          matchesSearch &&
          matchesType
        );
      }
    );


  // =========================================================
  // SELECT SINGLE
  // =========================================================

  function toggleTransactionSelection(
    transactionId
  ) {

    setSelectedTransactions(
      (previous) => {

        if (
          previous.includes(
            transactionId
          )
        ) {

          return previous.filter(
            (id) =>
              id !==
              transactionId
          );
        }


        return [
          ...previous,
          transactionId,
        ];
      }
    );
  }


  // =========================================================
  // SELECT ALL VISIBLE
  // =========================================================

  function toggleSelectAll() {

    const visibleIds =
      filteredTransactions.map(
        (transaction) =>
          transaction.id
      );


    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every(
        (id) =>
          selectedTransactions.includes(
            id
          )
      );


    if (allSelected) {

      setSelectedTransactions(
        (previous) =>

          previous.filter(
            (id) =>
              !visibleIds.includes(
                id
              )
          )
      );

    } else {

      setSelectedTransactions(
        (previous) => [

          ...new Set([

            ...previous,

            ...visibleIds,

          ]),

        ]
      );
    }
  }


  // =========================================================
  // SELECTION STATE
  // =========================================================

  const visibleTransactionIds =
    filteredTransactions.map(
      (transaction) =>
        transaction.id
    );


  const allVisibleSelected =
    visibleTransactionIds.length >
      0 &&
    visibleTransactionIds.every(
      (id) =>
        selectedTransactions.includes(
          id
        )
    );


  const someVisibleSelected =
    visibleTransactionIds.some(
      (id) =>
        selectedTransactions.includes(
          id
        )
    );


  // =========================================================
  // BULK DELETE
  // =========================================================

  async function handleBulkDelete() {

    if (
      selectedTransactions.length ===
      0
    ) {
      return;
    }


    const selectedCount =
      selectedTransactions.length;


    const confirmed =
      window.confirm(

        `Delete ${selectedCount} selected transaction${
          selectedCount === 1
            ? ""
            : "s"
        }?\n\nThis action cannot be undone. Account balances will also be updated.`

      );


    if (!confirmed) {
      return;
    }


    try {

      setBulkDeleting(true);

      setError("");

      setSuccess("");


      await bulkDeleteTransactions(
        selectedTransactions
      );


      // Remove deleted transactions
      // immediately from UI.

      setTransactions(
        (previous) =>

          previous.filter(
            (transaction) =>

              !selectedTransactions.includes(
                transaction.id
              )
          )
      );


      setSelectedTransactions([]);


      // Refresh account balances.

      await loadAccounts();


      setSuccess(

        `${selectedCount} transaction${
          selectedCount === 1
            ? ""
            : "s"
        } deleted successfully.`

      );


    } catch (err) {

      console.error(
        "Bulk delete transactions error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to delete selected transactions."
        )
      );

    } finally {

      setBulkDeleting(false);
    }
  }


  // =========================================================
  // SUMMARY
  // =========================================================

  const incomeTotal =
    transactions

      .filter(
        (item) =>
          item.transaction_type ===
          "income"
      )

      .reduce(
        (sum, item) =>
          sum +
          Number(
            item.amount || 0
          ),

        0
      );


  const expenseTotal =
    transactions

      .filter(
        (item) =>
          item.transaction_type ===
          "expense"
      )

      .reduce(
        (sum, item) =>
          sum +
          Number(
            item.amount || 0
          ),

        0
      );


  const transferTotal =
    transactions

      .filter(
        (item) =>
          item.transaction_type ===
          "transfer"
      )

      .reduce(
        (sum, item) =>
          sum +
          Number(
            item.amount || 0
          ),

        0
      );


  // =========================================================
  // ACCOUNT NAME
  // =========================================================

  function getAccountName(
    accountId
  ) {

    const account =
      accounts.find(
        (item) =>
          Number(item.id) ===
          Number(accountId)
      );


    return (
      account?.name ||
      `Account #${accountId}`
    );
  }


  // =========================================================
  // MONEY
  // =========================================================

  function money(value) {

    return `₹${Number(
      value || 0
    ).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  }


  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {

    return (

      <div className="transactions-page">

        <div className="transactions-loading">

          <div className="transactions-spinner" />

          <h2>
            Loading transactions...
          </h2>

          <p>
            Getting your financial activity.
          </p>

        </div>

      </div>
    );
  }


  // =========================================================
  // UI
  // =========================================================

  return (

    <div className="transactions-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="transactions-header">

        <div>

          <div className="transactions-eyebrow">
            LEDGERFLOW WORKSPACE
          </div>

          <h1>
            Transactions
          </h1>

          <p>
            Review and manage your business
            income, expenses and transfers.
          </p>

        </div>


        <button
          type="button"
          className="transactions-primary-button"
          onClick={openAddModal}
        >

          <Plus size={17} />

          Add transaction

        </button>

      </div>


      {/* =====================================================
          ERROR
      ===================================================== */}

      {error &&
        !showModal && (

          <div className="transactions-error">

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
            >
              <X size={17} />
            </button>

          </div>
        )}


      {/* =====================================================
          SUCCESS
      ===================================================== */}

      {success && (

        <div className="transactions-success">

          <span>
            {success}
          </span>

          <button
            type="button"
            onClick={() =>
              setSuccess("")
            }
          >
            <X size={17} />
          </button>

        </div>
      )}


      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <div className="transactions-summary">

        <div className="transaction-summary-card">

          <div className="transaction-summary-icon">
            <ArrowLeftRight size={21} />
          </div>

          <div>

            <span>
              Total transactions
            </span>

            <strong>
              {transactions.length}
            </strong>

          </div>

        </div>


        <div className="transaction-summary-card">

          <div className="transaction-summary-icon income">
            <Plus size={21} />
          </div>

          <div>

            <span>
              Total income
            </span>

            <strong>
              {money(incomeTotal)}
            </strong>

          </div>

        </div>


        <div className="transaction-summary-card">

          <div className="transaction-summary-icon expense">
            <Wallet size={21} />
          </div>

          <div>

            <span>
              Total expenses
            </span>

            <strong>
              {money(expenseTotal)}
            </strong>

          </div>

        </div>


        <div className="transaction-summary-card">

          <div className="transaction-summary-icon">
            <ArrowLeftRight size={21} />
          </div>

          <div>

            <span>
              Total transfers
            </span>

            <strong>
              {money(transferTotal)}
            </strong>

          </div>

        </div>

      </div>


      {/* =====================================================
          TRANSACTION PANEL
      ===================================================== */}

      <section className="transactions-panel">

        <div className="transactions-toolbar">

          <div>

            <span className="transactions-panel-eyebrow">
              GENERAL LEDGER
            </span>

            <h2>
              All transactions
            </h2>

          </div>


          <div className="transactions-filters">

            <div className="transactions-search">

              <Search size={17} />

              <input
                type="text"
                placeholder="Search transactions..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
              />

            </div>


            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target.value
                )
              }
            >

              <option value="all">
                All types
              </option>

              <option value="income">
                Income
              </option>

              <option value="expense">
                Expense
              </option>

              <option value="transfer">
                Transfer
              </option>

            </select>

          </div>

        </div>


        {/* ===================================================
            EMPTY STATE
        =================================================== */}

        {filteredTransactions.length ===
        0 ? (

          <div className="transactions-empty">

            <ArrowLeftRight size={40} />

            <strong>

              {search ||
              typeFilter !== "all"

                ? "No transactions found"

                : "No transactions yet"}

            </strong>


            <p>

              {search ||
              typeFilter !== "all"

                ? "Try changing your search or filter."

                : "Create your first transaction to start your ledger."}

            </p>


            {!search &&
              typeFilter ===
                "all" && (

                <button
                  type="button"
                  className="transactions-primary-button"
                  onClick={
                    openAddModal
                  }
                >

                  <Plus size={16} />

                  Add transaction

                </button>
              )}

          </div>

        ) : (

          <div className="transactions-table">

            {/* =================================================
                TABLE HEADER
            ================================================= */}

            <div className="transactions-table-header">

              <div className="transaction-select-all">

                <button
                  type="button"
                  title={
                    allVisibleSelected
                      ? "Deselect all"
                      : "Select all"
                  }
                  onClick={
                    toggleSelectAll
                  }
                  disabled={
                    bulkDeleting
                  }
                >

                  {allVisibleSelected ? (

                    <CheckSquare
                      size={17}
                    />

                  ) : (

                    <Square
                      size={17}
                    />

                  )}

                </button>

                <span>
                  Select
                </span>

              </div>


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
                Account
              </span>

              <span>
                Amount
              </span>

              <span>
                Action
              </span>

            </div>


            {/* =================================================
                BULK ACTION BAR
            ================================================= */}

            {selectedTransactions.length >
              0 && (

              <div className="transactions-bulk-bar">

                <div>

                  <strong>
                    {
                      selectedTransactions.length
                    }
                  </strong>

                  <span>

                    {" "}
                    transaction
                    {selectedTransactions.length ===
                    1
                      ? ""
                      : "s"}{" "}
                    selected

                  </span>

                </div>


                <button
                  type="button"
                  className="transactions-bulk-delete-button"
                  onClick={
                    handleBulkDelete
                  }
                  disabled={
                    bulkDeleting
                  }
                >

                  <Trash2 size={16} />

                  {bulkDeleting
                    ? "Deleting..."
                    : "Delete selected"}

                </button>

              </div>
            )}


            {/* =================================================
                TRANSACTION ROWS
            ================================================= */}

            {filteredTransactions.map(
              (transaction) => {

                const type =
                  transaction.transaction_type;


                const isSelected =
                  selectedTransactions.includes(
                    transaction.id
                  );


                return (

                  <div
                    className={`transaction-row ${
                      isSelected
                        ? "selected"
                        : ""
                    }`}
                    key={
                      transaction.id
                    }
                  >

                    {/* SELECT */}

                    <div className="transaction-select">

                      <button
                        type="button"
                        title={
                          isSelected
                            ? "Deselect transaction"
                            : "Select transaction"
                        }
                        onClick={() =>
                          toggleTransactionSelection(
                            transaction.id
                          )
                        }
                        disabled={
                          bulkDeleting
                        }
                      >

                        {isSelected ? (

                          <CheckSquare
                            size={17}
                          />

                        ) : (

                          <Square
                            size={17}
                          />

                        )}

                      </button>

                    </div>


                    {/* DESCRIPTION */}

                    <div className="transaction-description">

                      <strong>
                        {
                          transaction.description
                        }
                      </strong>

                      <small>

                        Transaction #
                        {
                          transaction.id
                        }

                      </small>

                    </div>


                    {/* TYPE */}

                    <div>

                      <span
                        className={`transaction-type ${type}`}
                      >
                        {type}
                      </span>

                    </div>


                    {/* DATE */}

                    <div className="transaction-date">

                      {
                        transaction.date
                      }

                    </div>


                    {/* ACCOUNT */}

                    <div className="transaction-account">

                      {
                        transaction.account_name ||
                        getAccountName(
                          transaction.account_id
                        )
                      }


                      {type ===
                        "transfer" &&
                        transaction.destination_account_name && (

                          <small>

                            →
                            {" "}

                            {
                              transaction.destination_account_name
                            }

                          </small>
                        )}

                    </div>


                    {/* AMOUNT */}

                    <div
                      className={`transaction-amount ${type}`}
                    >

                      {type ===
                        "income" &&
                        "+"}


                      {type ===
                        "expense" &&
                        "-"}


                      {money(
                        transaction.amount
                      )}

                    </div>


                    {/* ACTIONS */}

                    <div className="transaction-actions">

                      <button
                        type="button"
                        title="Edit transaction"
                        onClick={() =>
                          openEditModal(
                            transaction
                          )
                        }
                        disabled={
                          bulkDeleting
                        }
                      >

                        <Edit size={16} />

                      </button>


                      <button
                        type="button"
                        title="Delete transaction"
                        onClick={() =>
                          handleDelete(
                            transaction
                          )
                        }
                        disabled={
                          bulkDeleting
                        }
                      >

                        <Trash2 size={16} />

                      </button>

                    </div>

                  </div>
                );
              }
            )}

          </div>
        )}

      </section>


      {/* =====================================================
          ADD / EDIT MODAL
      ===================================================== */}

      {showModal && (

        <div
          className="transactions-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {

              closeModal();
            }

          }}
        >

          <div
            className="transactions-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="transactions-modal-header">

              <div>

                <span>

                  {editingTransaction
                    ? "EDIT TRANSACTION"
                    : "NEW TRANSACTION"}

                </span>

                <h2>

                  {editingTransaction
                    ? "Edit transaction"
                    : "Add transaction"}

                </h2>

              </div>


              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
              >

                <X size={18} />

              </button>

            </div>


            {/* FORM */}

            <form
              className="transactions-form"
              onSubmit={
                handleSubmit
              }
            >

              {/* DESCRIPTION */}

              <div className="transactions-form-group">

                <label>
                  Description
                </label>

                <input
                  type="text"
                  name="description"
                  value={
                    form.description
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Example: Office supplies"
                  required
                  autoFocus
                />

              </div>


              {/* AMOUNT + TYPE */}

              <div className="transactions-form-grid">

                <div className="transactions-form-group">

                  <label>
                    Amount
                  </label>

                  <input
                    type="number"
                    name="amount"
                    value={
                      form.amount
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    required
                  />

                </div>


                <div className="transactions-form-group">

                  <label>
                    Transaction type
                  </label>

                  <select
                    name="transaction_type"
                    value={
                      form.transaction_type
                    }
                    onChange={
                      handleChange
                    }
                  >

                    <option value="expense">
                      Expense
                    </option>

                    <option value="income">
                      Income
                    </option>

                    <option value="transfer">
                      Transfer
                    </option>

                  </select>

                </div>

              </div>


              {/* DATE + ACCOUNT */}

              <div className="transactions-form-grid">

                <div className="transactions-form-group">

                  <label>
                    Date
                  </label>

                  <input
                    type="date"
                    name="date"
                    value={
                      form.date
                    }
                    onChange={
                      handleChange
                    }
                    required
                  />

                </div>


                <div className="transactions-form-group">

                  <label>

                    {form.transaction_type ===
                    "transfer"
                      ? "Source account"
                      : "Account"}

                  </label>


                  <select
                    name="account_id"
                    value={
                      form.account_id
                    }
                    onChange={
                      handleChange
                    }
                    required
                  >

                    <option value="">
                      Select account
                    </option>


                    {accounts.map(
                      (account) => (

                        <option
                          key={
                            account.id
                          }
                          value={
                            account.id
                          }
                        >

                          {
                            account.name
                          }

                        </option>

                      )
                    )}

                  </select>

                </div>

              </div>
        {/* CATEGORY */}

<div className="transactions-form-group">

  <label>
    Category
  </label>

  <select
    name="category_id"
    value={form.category_id ?? ""}
    onChange={handleChange}
  >

    <option value="">
      No category
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

              {/* DESTINATION ACCOUNT */}

              {form.transaction_type ===
                "transfer" && (

                <div className="transactions-form-group">

                  <label>
                    Destination account
                  </label>


                  <select
                    name="destination_account_id"
                    value={
                      form.destination_account_id
                    }
                    onChange={
                      handleChange
                    }
                    required
                  >

                    <option value="">
                      Select destination account
                    </option>


                    {accounts

                      .filter(
                        (account) =>

                          Number(
                            account.id
                          ) !==
                          Number(
                            form.account_id
                          )
                      )

                      .map(
                        (account) => (

                          <option
                            key={
                              account.id
                            }
                            value={
                              account.id
                            }
                          >

                            {
                              account.name
                            }

                          </option>

                        )
                      )}

                  </select>


                  <small>

                    Money will be deducted
                    from the source account
                    and added to this account.

                  </small>

                </div>
              )}


              {/* FORM ERROR */}

              {error && (

                <div className="transactions-form-error">

                  <span>
                    {error}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setError("")
                    }
                  >

                    <X size={14} />

                  </button>

                </div>
              )}


              {/* FORM ACTIONS */}

              <div className="transactions-form-actions">

                <button
                  type="button"
                  className="transactions-cancel-button"
                  onClick={
                    closeModal
                  }
                  disabled={
                    saving
                  }
                >

                  Cancel

                </button>


                <button
                  type="submit"
                  className="transactions-save-button"
                  disabled={
                    saving
                  }
                >

                  {saving

                    ? "Saving..."

                    : editingTransaction
                    ? "Update transaction"
                    : "Save transaction"}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}