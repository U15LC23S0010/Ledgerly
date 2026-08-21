import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Users,
  Mail,
  Phone,
  MapPin,
  X,
  CheckSquare,
  Square,
  Trash,
} from "lucide-react";

import api from "../api/api";
import "./Customers.css";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // =====================================================
  // SELECTED CUSTOMERS
  // =====================================================

  const [selectedIds, setSelectedIds] = useState([]);

  // =====================================================
  // FORM
  // =====================================================

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  // =====================================================
  // ERROR MESSAGE
  // =====================================================

  function getErrorMessage(
    err,
    fallback = "Something went wrong."
  ) {
    const detail = err?.response?.data?.detail;

    if (Array.isArray(detail)) {
      return detail
        .map((item) =>
          typeof item === "string"
            ? item
            : item?.msg || "Validation error"
        )
        .filter(Boolean)
        .join(", ");
    }

    if (typeof detail === "string") {
      return detail;
    }

    if (detail && typeof detail === "object") {
      return (
        detail.msg ||
        detail.message ||
        fallback
      );
    }

    return err?.message || fallback;
  }

  // =====================================================
  // LOAD CUSTOMERS
  // =====================================================

  async function loadCustomers() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/customers/");

      const data = response?.data;

      if (Array.isArray(data)) {
        setCustomers(data);
      } else if (Array.isArray(data?.customers)) {
        setCustomers(data.customers);
      } else {
        setCustomers([]);
      }

      // Remove selections that no longer exist
      setSelectedIds((previous) =>
        previous.filter((id) =>
          (Array.isArray(data) ? data : []).some(
            (customer) =>
              Number(customer.id) === Number(id)
          )
        )
      );
    } catch (err) {
      console.error(
        "Customers loading error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to load customers."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  // =====================================================
  // RESET FORM
  // =====================================================

  function resetForm() {
    setForm({
      name: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    });
  }

  // =====================================================
  // OPEN ADD
  // =====================================================

  function openAddForm() {
    resetForm();

    setEditingId(null);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  // =====================================================
  // OPEN EDIT
  // =====================================================

  function openEditForm(customer) {
    setEditingId(customer.id);

    setForm({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      notes: customer.notes || "",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  // =====================================================
  // CLOSE FORM
  // =====================================================

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setError("");

    resetForm();
  }

  // =====================================================
  // FORM CHANGE
  // =====================================================

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  }

  // =====================================================
  // CREATE / UPDATE
  // =====================================================

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const customerName = form.name.trim();

    if (!customerName) {
      setError(
        "Customer name is required."
      );
      return;
    }

    if (customerName.length < 2) {
      setError(
        "Customer name must contain at least 2 characters."
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: customerName,
        email:
          form.email.trim() || null,
        phone:
          form.phone.trim() || null,
        address:
          form.address.trim() || null,
        notes:
          form.notes.trim() || null,
      };

      if (editingId !== null) {
        await api.put(
          `/customers/${editingId}`,
          payload
        );

        await loadCustomers();

        setShowForm(false);
        setEditingId(null);
        resetForm();

        setSuccess(
          "Customer updated successfully."
        );
      } else {
        await api.post(
          "/customers/",
          payload
        );

        await loadCustomers();

        setShowForm(false);
        setEditingId(null);
        resetForm();

        setSuccess(
          "Customer created successfully."
        );
      }
    } catch (err) {
      console.error(
        "Save customer error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          editingId !== null
            ? "Unable to update customer."
            : "Unable to create customer."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // SINGLE DELETE
  // =====================================================

  async function handleDelete(customer) {
    const customerName =
      customer?.name || "this customer";

    if (
      !window.confirm(
        `Delete "${customerName}"?\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await api.delete(
        `/customers/${customer.id}`
      );

      setCustomers((previous) =>
        previous.filter(
          (item) =>
            Number(item.id) !==
            Number(customer.id)
        )
      );

      setSelectedIds((previous) =>
        previous.filter(
          (id) =>
            Number(id) !==
            Number(customer.id)
        )
      );

      setSuccess(
        "Customer deleted successfully."
      );
    } catch (err) {
      console.error(
        "Delete customer error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to delete customer."
        )
      );
    }
  }

  // =====================================================
  // SEARCH
  // =====================================================

  const query = search
    .trim()
    .toLowerCase();

  const filteredCustomers =
    customers.filter((customer) => {
      if (!query) return true;

      return [
        customer.name,
        customer.email,
        customer.phone,
        customer.address,
        customer.notes,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      );
    });

  // =====================================================
  // SELECTION
  // =====================================================

  const filteredIds = filteredCustomers.map(
    (customer) => Number(customer.id)
  );

  const selectedFilteredIds =
    filteredIds.filter((id) =>
      selectedIds.includes(id)
    );

  const allFilteredSelected =
    filteredIds.length > 0 &&
    selectedFilteredIds.length ===
      filteredIds.length;

  const someFilteredSelected =
    selectedFilteredIds.length > 0 &&
    !allFilteredSelected;

  // =====================================================
  // SELECT SINGLE
  // =====================================================

  function toggleCustomerSelection(id) {
    const numericId = Number(id);

    setSelectedIds((previous) => {
      if (previous.includes(numericId)) {
        return previous.filter(
          (item) =>
            item !== numericId
        );
      }

      return [
        ...previous,
        numericId,
      ];
    });

    setError("");
    setSuccess("");
  }

  // =====================================================
  // SELECT ALL / UNSELECT ALL
  //
  // This selects only the currently visible/search
  // filtered customers.
  // =====================================================

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds((previous) =>
        previous.filter(
          (id) =>
            !filteredIds.includes(
              Number(id)
            )
        )
      );
    } else {
      setSelectedIds((previous) => [
        ...new Set([
          ...previous,
          ...filteredIds,
        ]),
      ]);
    }

    setError("");
    setSuccess("");
  }

  // =====================================================
  // CLEAR SELECTION
  // =====================================================

  function clearSelection() {
    setSelectedIds([]);
  }

  // =====================================================
  // BULK DELETE
  // =====================================================

  async function handleBulkDelete() {
    if (selectedIds.length === 0) {
      setError(
        "Please select at least one customer."
      );
      return;
    }

    const selectedCustomers =
      customers.filter((customer) =>
        selectedIds.includes(
          Number(customer.id)
        )
      );

    const customerNames =
      selectedCustomers
        .slice(0, 5)
        .map(
          (customer) =>
            customer.name
        )
        .join(", ");

    const extraCount =
      selectedCustomers.length > 5
        ? ` and ${
            selectedCustomers.length - 5
          } more`
        : "";

    const confirmed =
      window.confirm(
        `Delete ${selectedCustomers.length} selected customer(s)?\n\n${customerNames}${extraCount}\n\nThis action cannot be undone.`
      );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await api.delete(
        "/customers/bulk-delete",
        {
          data: selectedIds,
        }
      );

      const selectedSet =
        new Set(selectedIds);

      setCustomers((previous) =>
        previous.filter(
          (customer) =>
            !selectedSet.has(
              Number(customer.id)
            )
        )
      );

      setSelectedIds([]);

      setSuccess(
        `${selectedCustomers.length} customer(s) deleted successfully.`
      );
    } catch (err) {
      console.error(
        "Bulk delete customers error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to delete selected customers."
        )
      );
    }
  }

  // =====================================================
  // SUMMARY
  // =====================================================

  const customersWithEmail =
    customers.filter(
      (customer) =>
        String(
          customer.email || ""
        ).trim()
    ).length;

  const customersWithPhone =
    customers.filter(
      (customer) =>
        String(
          customer.phone || ""
        ).trim()
    ).length;

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="customers-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="customers-header">

        <div className="customers-header-content">

          <div className="customers-eyebrow">
            BUSINESS
          </div>

          <h1>Customers</h1>

          <p>
            Manage your customers and keep their
            business information organized.
          </p>

        </div>

        <button
          type="button"
          className="customers-primary-button"
          onClick={openAddForm}
        >
          <Plus size={17} />
          <span>Add customer</span>
        </button>

      </div>


      {/* =================================================
          ERROR
      ================================================= */}

      {error && !showForm && (
        <div className="customers-error">

          <span>{error}</span>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            aria-label="Close error"
          >
            <X size={17} />
          </button>

        </div>
      )}


      {/* =================================================
          SUCCESS
      ================================================= */}

      {success && (
        <div className="customers-success">

          <span>{success}</span>

          <button
            type="button"
            onClick={() =>
              setSuccess("")
            }
            aria-label="Close success message"
          >
            <X size={17} />
          </button>

        </div>
      )}


      {/* =================================================
          SUMMARY
      ================================================= */}

      <section className="customer-summary">

        <div className="customer-summary-card">

          <div className="summary-icon">
            <Users size={21} />
          </div>

          <div className="summary-content">

            <span>
              Total customers
            </span>

            <strong>
              {customers.length}
            </strong>

          </div>

        </div>


        <div className="customer-summary-card">

          <div className="summary-icon">
            <Mail size={21} />
          </div>

          <div className="summary-content">

            <span>
              With email
            </span>

            <strong>
              {customersWithEmail}
            </strong>

          </div>

        </div>


        <div className="customer-summary-card">

          <div className="summary-icon">
            <Phone size={21} />
          </div>

          <div className="summary-content">

            <span>
              With phone
            </span>

            <strong>
              {customersWithPhone}
            </strong>

          </div>

        </div>

      </section>


      {/* =================================================
          MAIN PANEL
      ================================================= */}

      <section className="customers-panel">

        {/* TOOLBAR */}

        <div className="customers-toolbar">

          <div className="customers-toolbar-title">

            <span className="panel-eyebrow">
              CUSTOMER DIRECTORY
            </span>

            <h2>
              All customers
            </h2>

          </div>


          <div className="customer-toolbar-right">

            {/* BULK DELETE */}

            {selectedIds.length > 0 && (
              <button
                type="button"
                className="bulk-delete-button"
                onClick={handleBulkDelete}
              >
                <Trash size={16} />

                <span>
                  Delete selected
                </span>

                <strong>
                  {selectedIds.length}
                </strong>
              </button>
            )}


            {/* SEARCH */}

            <div className="customer-search">

              <Search size={17} />

              <input
                type="text"
                placeholder="Search customers..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
              />

              {search && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() =>
                    setSearch("")
                  }
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}

            </div>

          </div>

        </div>


        {/* =================================================
            SELECTION BAR
        ================================================= */}

        {!loading &&
          filteredCustomers.length > 0 && (
            <div className="customers-selection-bar">

              <label className="select-all-control">

                <input
                  type="checkbox"
                  checked={
                    allFilteredSelected
                  }
                  ref={(element) => {
                    if (element) {
                      element.indeterminate =
                        someFilteredSelected;
                    }
                  }}
                  onChange={
                    toggleSelectAll
                  }
                />

                {allFilteredSelected ? (
                  <CheckSquare
                    size={18}
                  />
                ) : (
                  <Square
                    size={18}
                  />
                )}

                <span>
                  {allFilteredSelected
                    ? "All visible selected"
                    : "Select all"}
                </span>

              </label>


              {selectedIds.length >
                0 && (
                <div className="selection-info">

                  <span>
                    {selectedIds.length}{" "}
                    selected
                  </span>

                  <button
                    type="button"
                    onClick={
                      clearSelection
                    }
                  >
                    Clear selection
                  </button>

                </div>
              )}

            </div>
          )}


        {/* =================================================
            LOADING
        ================================================= */}

        {loading && (
          <div className="customers-loading">

            <div className="customer-spinner" />

            <p>
              Loading customers...
            </p>

          </div>
        )}


        {/* =================================================
            EMPTY
        ================================================= */}

        {!loading &&
          filteredCustomers.length ===
            0 && (
            <div className="customers-empty">

              <div className="empty-icon">
                <Users size={32} />
              </div>

              <h3>
                {search
                  ? "No customers found"
                  : "No customers yet"}
              </h3>

              <p>
                {search
                  ? "Try a different search term."
                  : "Add your first customer to get started."}
              </p>

              {!search && (
                <button
                  type="button"
                  className="customers-primary-button"
                  onClick={
                    openAddForm
                  }
                >
                  <Plus size={16} />
                  <span>
                    Add customer
                  </span>
                </button>
              )}

            </div>
          )}


        {/* =================================================
            CUSTOMER TABLE
        ================================================= */}

        {!loading &&
          filteredCustomers.length >
            0 && (
            <div className="customers-table">

              <div className="customer-table-header">

                <span>
                  Select
                </span>

                <span>
                  Customer
                </span>

                <span>
                  Contact
                </span>

                <span>
                  Address
                </span>

                <span>
                  Actions
                </span>

              </div>


              {filteredCustomers.map(
                (customer) => {

                  const customerId =
                    Number(
                      customer.id
                    );

                  const isSelected =
                    selectedIds.includes(
                      customerId
                    );

                  return (
                    <div
                      className={`customer-row ${
                        isSelected
                          ? "customer-row-selected"
                          : ""
                      }`}
                      key={
                        customer.id
                      }
                    >

                      {/* SELECT */}

                      <div className="customer-select-cell">

                        <input
                          type="checkbox"
                          checked={
                            isSelected
                          }
                          onChange={() =>
                            toggleCustomerSelection(
                              customerId
                            )
                          }
                          aria-label={`Select ${customer.name}`}
                        />

                      </div>


                      {/* CUSTOMER */}

                      <div className="customer-name-cell">

                        <div className="customer-avatar">

                          {customer.name
                            ?.charAt(0)
                            ?.toUpperCase() ||
                            "C"}

                        </div>

                        <div className="customer-name-info">

                          <strong>
                            {customer.name ||
                              "Unnamed customer"}
                          </strong>

                          <small>
                            Customer #
                            {customer.id}
                          </small>

                        </div>

                      </div>


                      {/* CONTACT */}

                      <div className="customer-contact">

                        {customer.email && (
                          <span>

                            <Mail
                              size={14}
                            />

                            <span>
                              {
                                customer.email
                              }
                            </span>

                          </span>
                        )}

                        {customer.phone && (
                          <span>

                            <Phone
                              size={14}
                            />

                            <span>
                              {
                                customer.phone
                              }
                            </span>

                          </span>
                        )}

                        {!customer.email &&
                          !customer.phone && (
                            <small>
                              No contact details
                            </small>
                          )}

                      </div>


                      {/* ADDRESS */}

                      <div className="customer-address">

                        {customer.address ? (
                          <>
                            <MapPin
                              size={15}
                            />

                            <span>
                              {
                                customer.address
                              }
                            </span>
                          </>
                        ) : (
                          <span className="muted">
                            No address
                          </span>
                        )}

                      </div>


                      {/* ACTIONS */}

                      <div className="customer-actions">

                        <button
                          type="button"
                          title="Edit customer"
                          aria-label={`Edit ${customer.name}`}
                          onClick={() =>
                            openEditForm(
                              customer
                            )
                          }
                        >
                          <Pencil
                            size={16}
                          />
                        </button>

                        <button
                          type="button"
                          title="Delete customer"
                          aria-label={`Delete ${customer.name}`}
                          className="delete"
                          onClick={() =>
                            handleDelete(
                              customer
                            )
                          }
                        >
                          <Trash2
                            size={16}
                          />
                        </button>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

      </section>


      {/* =================================================
          CUSTOMER FORM MODAL
      ================================================= */}

      {showForm && (
        <div
          className="customer-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeForm();
            }
          }}
        >

          <div
            className="customer-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="customer-modal-header">

              <div>

                <span className="customer-modal-eyebrow">

                  {editingId !== null
                    ? "CUSTOMER DETAILS"
                    : "NEW CUSTOMER"}

                </span>

                <h2>

                  {editingId !== null
                    ? "Edit customer"
                    : "Add customer"}

                </h2>

              </div>


              <button
                type="button"
                className="customer-modal-close"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close customer form"
              >
                <X size={19} />
              </button>

            </div>


            <form
              className="customer-form"
              onSubmit={handleSubmit}
            >

              <div className="customer-form-group">

                <label htmlFor="customer-name">
                  Customer name *
                </label>

                <input
                  id="customer-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. ABC Technologies"
                  minLength={2}
                  maxLength={200}
                  autoComplete="organization"
                  required
                />

              </div>


              <div className="customer-form-grid">

                <div className="customer-form-group">

                  <label htmlFor="customer-email">
                    Email
                  </label>

                  <input
                    id="customer-email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={
                      handleChange
                    }
                    placeholder="customer@example.com"
                    autoComplete="email"
                  />

                </div>


                <div className="customer-form-group">

                  <label htmlFor="customer-phone">
                    Phone
                  </label>

                  <input
                    id="customer-phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={
                      handleChange
                    }
                    placeholder="9876543210"
                    autoComplete="tel"
                  />

                </div>

              </div>


              <div className="customer-form-group">

                <label htmlFor="customer-address">
                  Address
                </label>

                <textarea
                  id="customer-address"
                  name="address"
                  rows={3}
                  value={form.address}
                  onChange={
                    handleChange
                  }
                  placeholder="Customer address"
                  maxLength={1000}
                />

              </div>


              <div className="customer-form-group">

                <label htmlFor="customer-notes">
                  Notes
                </label>

                <textarea
                  id="customer-notes"
                  name="notes"
                  rows={3}
                  value={form.notes}
                  onChange={
                    handleChange
                  }
                  placeholder="Additional notes"
                  maxLength={2000}
                />

              </div>


              {error && (
                <div className="customer-form-error">

                  <span>
                    {error}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setError("")
                    }
                    aria-label="Close form error"
                  >
                    <X size={15} />
                  </button>

                </div>
              )}


              <div className="customer-form-actions">

                <button
                  type="button"
                  className="customer-cancel-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="customer-save-button"
                  disabled={saving}
                >
                  {saving
                    ? editingId !== null
                      ? "Updating..."
                      : "Saving..."
                    : editingId !== null
                      ? "Update customer"
                      : "Save customer"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}