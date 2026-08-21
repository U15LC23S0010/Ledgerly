import { useEffect, useState } from "react";

import {
  Wallet,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckSquare,
  Square,
} from "lucide-react";

import api from "../api/api";
import "./Accounts.css";


export default function Accounts() {

  const [accounts, setAccounts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);

  const [editingAccount, setEditingAccount] =
    useState(null);

  const [selectedAccounts, setSelectedAccounts] =
    useState([]);

  const [deleting, setDeleting] =
    useState(false);

  const [form, setForm] = useState({
    name: "",
    account_type: "asset",
    balance: "",
  });

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");


  // =====================================================
  // ERROR MESSAGE
  // =====================================================

  const getErrorMessage = (err, fallback) => {

    const detail =
      err?.response?.data?.detail;

    if (Array.isArray(detail)) {

      return detail
        .map((item) => {

          if (typeof item === "string") {
            return item;
          }

          if (item?.msg) {
            return item.msg;
          }

          return "";

        })
        .filter(Boolean)
        .join(", ");
    }

    if (typeof detail === "string") {
      return detail;
    }

    return fallback;
  };


  // =====================================================
  // LOAD ACCOUNTS
  // =====================================================

  const loadAccounts = async () => {

    try {

      setLoading(true);
      setError("");

      const response =
        await api.get("/accounts/");

      setAccounts(
        Array.isArray(response.data)
          ? response.data
          : []
      );

      setSelectedAccounts([]);

    } catch (err) {

      console.error(
        "Accounts error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to load accounts."
        )
      );

    } finally {

      setLoading(false);

    }
  };


  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadAccounts();
  }, []);


  // =====================================================
  // OPEN ADD MODAL
  // =====================================================

  const openAddModal = () => {

    setEditingAccount(null);

    setForm({
      name: "",
      account_type: "asset",
      balance: "",
    });

    setError("");
    setSuccess("");

    setShowModal(true);
  };


  // =====================================================
  // OPEN EDIT MODAL
  // =====================================================

  const openEditModal = (account) => {

    setEditingAccount(account);

    setForm({
      name: account.name || "",

      account_type:
        account.account_type ||
        "asset",

      balance:
        account.balance ?? "",
    });

    setError("");
    setSuccess("");

    setShowModal(true);
  };


  // =====================================================
  // CLOSE MODAL
  // =====================================================

  const closeModal = () => {

    if (deleting) {
      return;
    }

    setShowModal(false);

    setEditingAccount(null);

    setError("");
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

    setError("");
  };


  // =====================================================
  // CREATE / UPDATE
  // =====================================================

  const handleSubmit = async (event) => {

    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.name.trim()) {

      setError(
        "Account name is required."
      );

      return;
    }

    const balance =
      Number(form.balance || 0);

    if (Number.isNaN(balance)) {

      setError(
        "Balance must be a valid number."
      );

      return;
    }

    try {

      setDeleting(false);

      const payload = {

        name:
          form.name.trim(),

        account_type:
          form.account_type,

        balance,
      };


      if (editingAccount) {

        await api.put(
          `/accounts/${editingAccount.id}`,
          payload
        );

        setSuccess(
          "Account updated successfully."
        );

      } else {

        await api.post(
          "/accounts/",
          payload
        );

        setSuccess(
          "Account created successfully."
        );
      }


      setShowModal(false);

      setEditingAccount(null);

      setForm({
        name: "",
        account_type: "asset",
        balance: "",
      });

      await loadAccounts();

    } catch (err) {

      console.error(
        "Save account error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to save account."
        )
      );
    }
  };


  // =====================================================
  // SELECT SINGLE ACCOUNT
  // =====================================================

  const toggleAccountSelection = (
    accountId
  ) => {

    setSelectedAccounts(
      (previous) => {

        if (
          previous.includes(accountId)
        ) {

          return previous.filter(
            (id) =>
              id !== accountId
          );
        }

        return [
          ...previous,
          accountId,
        ];
      }
    );
  };


  // =====================================================
  // SELECT ALL ACCOUNTS
  // =====================================================

  const toggleSelectAll = () => {

    const allIds =
      accounts.map(
        (account) =>
          account.id
      );

    const allSelected =
      allIds.length > 0 &&
      allIds.every(
        (id) =>
          selectedAccounts.includes(id)
      );


    if (allSelected) {

      setSelectedAccounts([]);

    } else {

      setSelectedAccounts(
        allIds
      );
    }
  };


  // =====================================================
  // SELECT ALL STATE
  // =====================================================

  const allAccountsSelected =
    accounts.length > 0 &&
    accounts.every(
      (account) =>
        selectedAccounts.includes(
          account.id
        )
    );


  // =====================================================
  // BULK DELETE
  // =====================================================

  const handleBulkDelete = async () => {

    if (
      selectedAccounts.length === 0
    ) {
      return;
    }


    const selectedCount =
      selectedAccounts.length;


    const confirmed =
      window.confirm(
        `Delete ${selectedCount} selected account${
          selectedCount === 1
            ? ""
            : "s"
        }?\n\nThis action cannot be undone.`
      );


    if (!confirmed) {
      return;
    }


    try {

      setDeleting(true);

      setError("");
      setSuccess("");


      await api.delete(
        "/accounts/bulk",
        {
          data: {
            account_ids:
              selectedAccounts,
          },
        }
      );


      setAccounts(
        (previous) =>
          previous.filter(
            (account) =>
              !selectedAccounts.includes(
                account.id
              )
          )
      );


      setSelectedAccounts([]);


      setSuccess(
        `${selectedCount} account${
          selectedCount === 1
            ? ""
            : "s"
        } deleted successfully.`
      );


    } catch (err) {

      console.error(
        "Bulk delete accounts error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to delete selected accounts."
        )
      );

    } finally {

      setDeleting(false);

    }
  };


  // =====================================================
  // SINGLE DELETE
  // =====================================================

  const handleDelete = async (
    account
  ) => {

    const confirmed =
      window.confirm(
        `Delete "${account.name}"?\n\nThis action cannot be undone.`
      );


    if (!confirmed) {
      return;
    }


    try {

      setDeleting(true);

      setError("");
      setSuccess("");


      await api.delete(
        `/accounts/${account.id}`
      );


      setAccounts(
        (previous) =>
          previous.filter(
            (item) =>
              item.id !== account.id
          )
      );


      setSelectedAccounts(
        (previous) =>
          previous.filter(
            (id) =>
              id !== account.id
          )
      );


      setSuccess(
        "Account deleted successfully."
      );


    } catch (err) {

      console.error(
        "Delete account error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to delete account."
        )
      );

    } finally {

      setDeleting(false);

    }
  };


  // =====================================================
  // SUMMARY
  // =====================================================

  const totalBalance =
    accounts.reduce(
      (total, account) =>
        total +
        Number(
          account.balance || 0
        ),
      0
    );


  // =====================================================
  // MONEY
  // =====================================================

  const money = (value) => {

    return `₹${Number(
      value || 0
    ).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  };


  // =====================================================
  // UI
  // =====================================================

  return (

    <div className="accounts-page">

      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <div className="accounts-header">

        <div>

          <div className="accounts-eyebrow">
            LEDGERFLOW WORKSPACE
          </div>

          <h1>
            Accounts
          </h1>

          <p>
            Manage your bank accounts, cash
            and financial balances.
          </p>

        </div>


        <button
          type="button"
          className="accounts-primary-button"
          onClick={openAddModal}
        >
          <Plus size={17} />
          Add account
        </button>

      </div>


      {/* ================================================= */}
      {/* ERROR */}
      {/* ================================================= */}

      {error && (

        <div className="accounts-error">

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
          >
            <X size={15} />
          </button>

        </div>

      )}


      {/* ================================================= */}
      {/* SUCCESS */}
      {/* ================================================= */}

      {success && (

        <div className="accounts-success">

          <span>
            {success}
          </span>

          <button
            type="button"
            onClick={() =>
              setSuccess("")
            }
          >
            <X size={15} />
          </button>

        </div>

      )}


      {/* ================================================= */}
      {/* SUMMARY */}
      {/* ================================================= */}

      <div className="accounts-summary">

        <div className="accounts-summary-card">

          <div className="accounts-summary-icon">
            <Wallet size={22} />
          </div>

          <div>

            <span>
              Total accounts
            </span>

            <strong>
              {accounts.length}
            </strong>

          </div>

        </div>


        <div className="accounts-summary-card">

          <div className="accounts-summary-icon">
            <Wallet size={22} />
          </div>

          <div>

            <span>
              Total balance
            </span>

            <strong>
              {money(totalBalance)}
            </strong>

          </div>

        </div>

      </div>


      {/* ================================================= */}
      {/* ACCOUNTS CARD */}
      {/* ================================================= */}

      <div className="accounts-card">

        <div className="accounts-card-header">

          <div>

            <span>
              FINANCIAL ACCOUNTS
            </span>

            <h2>
              Your accounts
            </h2>

          </div>


          <button
            type="button"
            className="accounts-secondary-button"
            onClick={openAddModal}
          >
            <Plus size={15} />
            Add account
          </button>

        </div>


        {/* ================================================= */}
        {/* LOADING */}
        {/* ================================================= */}

        {loading && (

          <div className="accounts-empty">

            <Wallet size={30} />

            <strong>
              Loading accounts...
            </strong>

          </div>

        )}


        {/* ================================================= */}
        {/* EMPTY */}
        {/* ================================================= */}

        {!loading &&
          accounts.length === 0 && (

          <div className="accounts-empty">

            <Wallet size={36} />

            <strong>
              No accounts yet
            </strong>

            <p>
              Add your first bank, cash or
              financial account to start
              managing your books.
            </p>

            <button
              type="button"
              className="accounts-primary-button"
              onClick={openAddModal}
            >
              <Plus size={16} />
              Add your first account
            </button>

          </div>

        )}


        {/* ================================================= */}
        {/* ACCOUNT LIST */}
        {/* ================================================= */}

        {!loading &&
          accounts.length > 0 && (

          <div className="accounts-list">

            {/* ============================================= */}
            {/* BULK ACTION BAR */}
            {/* ============================================= */}

            <div className="accounts-selection-bar">

              <div className="accounts-select-all">

                <button
                  type="button"
                  title={
                    allAccountsSelected
                      ? "Deselect all"
                      : "Select all"
                  }
                  onClick={
                    toggleSelectAll
                  }
                  disabled={deleting}
                >

                  {allAccountsSelected ? (
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
                  Select all
                </span>

              </div>


              {selectedAccounts.length >
                0 && (

                <div className="accounts-bulk-actions">

                  <span>
                    <strong>
                      {
                        selectedAccounts.length
                      }
                    </strong>{" "}
                    account
                    {selectedAccounts.length ===
                    1
                      ? ""
                      : "s"}{" "}
                    selected
                  </span>


                  <button
                    type="button"
                    className="accounts-bulk-delete-button"
                    onClick={
                      handleBulkDelete
                    }
                    disabled={deleting}
                  >

                    <Trash2 size={15} />

                    {deleting
                      ? "Deleting..."
                      : "Delete selected"}

                  </button>

                </div>

              )}

            </div>


            {/* ============================================= */}
            {/* ACCOUNT ROWS */}
            {/* ============================================= */}

            {accounts.map(
              (account) => {

                const selected =
                  selectedAccounts.includes(
                    account.id
                  );

                return (

                  <div
                    className={`account-row ${
                      selected
                        ? "selected"
                        : ""
                    }`}
                    key={
                      account.id
                    }
                  >

                    {/* SELECT */}

                    <div className="account-select">

                      <button
                        type="button"
                        title={
                          selected
                            ? "Deselect account"
                            : "Select account"
                        }
                        onClick={() =>
                          toggleAccountSelection(
                            account.id
                          )
                        }
                        disabled={
                          deleting
                        }
                      >

                        {selected ? (
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


                    {/* ACCOUNT */}

                    <div className="account-main">

                      <div className="account-icon">
                        <Wallet size={19} />
                      </div>

                      <div>

                        <strong>
                          {
                            account.name
                          }
                        </strong>

                        <span>
                          {
                            account.account_type
                          }
                        </span>

                      </div>

                    </div>


                    {/* BALANCE */}

                    <div className="account-balance">

                      {money(
                        account.balance
                      )}

                    </div>


                    {/* ACTIONS */}

                    <div className="account-actions">

                      <button
                        type="button"
                        title="Edit account"
                        onClick={() =>
                          openEditModal(
                            account
                          )
                        }
                        disabled={
                          deleting
                        }
                      >
                        <Pencil size={15} />
                      </button>


                      <button
                        type="button"
                        title="Delete account"
                        onClick={() =>
                          handleDelete(
                            account
                          )
                        }
                        disabled={
                          deleting
                        }
                      >
                        <Trash2 size={15} />
                      </button>

                    </div>

                  </div>

                );
              }
            )}

          </div>

        )}

      </div>


      {/* ================================================= */}
      {/* MODAL */}
      {/* ================================================= */}

      {showModal && (

        <div
          className="accounts-modal-overlay"
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
            className="accounts-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="accounts-modal-header">

              <div>

                <span>
                  {editingAccount
                    ? "EDIT ACCOUNT"
                    : "NEW ACCOUNT"}
                </span>

                <h2>
                  {editingAccount
                    ? "Edit account"
                    : "Add account"}
                </h2>

              </div>


              <button
                type="button"
                onClick={
                  closeModal
                }
              >
                <X size={18} />
              </button>

            </div>


            <form
              className="accounts-form"
              onSubmit={
                handleSubmit
              }
            >

              <div className="accounts-form-group">

                <label>
                  Account name
                </label>

                <input
                  type="text"
                  name="name"
                  value={
                    form.name
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Example: HDFC Bank"
                  required
                />

              </div>


              <div className="accounts-form-group">

                <label>
                  Account type
                </label>

                <select
                  name="account_type"
                  value={
                    form.account_type
                  }
                  onChange={
                    handleChange
                  }
                >

                  <option value="asset">
                    Asset
                  </option>

                  <option value="liability">
                    Liability
                  </option>

                  <option value="equity">
                    Equity
                  </option>

                  <option value="revenue">
                    Revenue
                  </option>

                  <option value="expense">
                    Expense
                  </option>

                </select>

              </div>


              <div className="accounts-form-group">

                <label>
                  Opening balance
                </label>

                <input
                  type="number"
                  name="balance"
                  value={
                    form.balance
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="0.00"
                  step="0.01"
                />

              </div>


              <div className="accounts-form-actions">

                <button
                  type="button"
                  className="accounts-cancel-button"
                  onClick={
                    closeModal
                  }
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="accounts-primary-button"
                >

                  {editingAccount
                    ? "Save changes"
                    : "Create account"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}