import { useEffect, useState } from "react";

import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Building2,
  Mail,
  Phone,
  MapPin,
  X,
  CheckSquare,
  Square,
} from "lucide-react";

import {
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  bulkDeleteVendors,
} from "../api/vendorsApi";

import "./Vendors.css";


export default function Vendors() {

  // =====================================================
  // STATE
  // =====================================================

  const [vendors, setVendors] = useState([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [selectedIds, setSelectedIds] = useState([]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });


  // =====================================================
  // ERROR HELPER
  // =====================================================

  function getErrorMessage(err, fallback) {

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

    return fallback;
  }


  // =====================================================
  // LOAD VENDORS
  // =====================================================

  async function loadVendors() {

    try {

      setLoading(true);

      setError("");

      const response = await getVendors();

      const data = Array.isArray(response.data)
        ? response.data
        : [];

      setVendors(data);

      // Remove selections that no longer exist
      setSelectedIds((previous) =>
        previous.filter((id) =>
          data.some(
            (vendor) => Number(vendor.id) === Number(id)
          )
        )
      );

    } catch (err) {

      console.error("Vendors error:", err);

      setError(
        getErrorMessage(
          err,
          "Unable to load vendors."
        )
      );

    } finally {

      setLoading(false);
    }
  }


  useEffect(() => {
    loadVendors();
  }, []);


  // =====================================================
  // ADD FORM
  // =====================================================

  function openAddForm() {

    setEditingId(null);

    setForm({
      name: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    });

    setError("");

    setSuccess("");

    setShowForm(true);
  }


  // =====================================================
  // EDIT FORM
  // =====================================================

  function openEditForm(vendor) {

    setEditingId(Number(vendor.id));

    setForm({
      name: vendor.name || "",
      email: vendor.email || "",
      phone: vendor.phone || "",
      address: vendor.address || "",
      notes: vendor.notes || "",
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
  }


  // =====================================================
  // INPUT CHANGE
  // =====================================================

  function handleChange(event) {

    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  }


  // =====================================================
  // CREATE / UPDATE
  // =====================================================

  async function handleSubmit(event) {

    event.preventDefault();

    if (!form.name.trim()) {

      setError(
        "Vendor name is required."
      );

      return;
    }

    try {

      setSaving(true);

      setError("");

      setSuccess("");

      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      };


      if (editingId !== null) {

        await updateVendor(
          Number(editingId),
          payload
        );

        setSuccess(
          "Vendor updated successfully."
        );

      } else {

        await createVendor(payload);

        setSuccess(
          "Vendor created successfully."
        );
      }


      await loadVendors();

      setShowForm(false);

      setEditingId(null);

      setForm({
        name: "",
        email: "",
        phone: "",
        address: "",
        notes: "",
      });

    } catch (err) {

      console.error(
        "Save vendor error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to save vendor."
        )
      );

    } finally {

      setSaving(false);
    }
  }


  // =====================================================
  // SELECT SINGLE VENDOR
  // =====================================================

  function toggleVendorSelection(vendorId) {

    const id = Number(vendorId);

    setSelectedIds((previous) => {

      if (previous.includes(id)) {

        return previous.filter(
          (selectedId) =>
            selectedId !== id
        );
      }

      return [
        ...previous,
        id,
      ];
    });
  }


  // =====================================================
  // SELECT ALL
  // =====================================================

  function toggleSelectAll() {

    const visibleIds = filteredVendors.map(
      (vendor) => Number(vendor.id)
    );

    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every(
        (id) =>
          selectedIds.includes(id)
      );

    if (allSelected) {

      setSelectedIds((previous) =>
        previous.filter(
          (id) =>
            !visibleIds.includes(id)
        )
      );

    } else {

      setSelectedIds((previous) => {

        const merged = [
          ...previous,
          ...visibleIds,
        ];

        return [
          ...new Set(merged),
        ];
      });
    }
  }


  // =====================================================
  // DELETE SINGLE
  // =====================================================

  async function handleDelete(vendor) {

    const vendorId = Number(vendor.id);

    const confirmed = window.confirm(
      `Delete "${vendor.name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {

      setDeleting(true);

      setError("");

      setSuccess("");

      await deleteVendor(vendorId);


      setVendors((previous) =>
        previous.filter(
          (item) =>
            Number(item.id) !== vendorId
        )
      );

      setSelectedIds((previous) =>
        previous.filter(
          (id) => id !== vendorId
        )
      );

      setSuccess(
        "Vendor deleted successfully."
      );

    } catch (err) {

      console.error(
        "Delete vendor error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to delete vendor."
        )
      );

    } finally {

      setDeleting(false);
    }
  }


  // =====================================================
  // DELETE SELECTED
  // =====================================================

  async function handleDeleteSelected() {

    if (selectedIds.length === 0) {

      setError(
        "Please select at least one vendor."
      );

      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedIds.length} selected vendor(s)?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {

      setDeleting(true);

      setError("");

      setSuccess("");


      // IMPORTANT:
      // Send an array of INTEGER IDs
      const ids = selectedIds.map(
        (id) => Number(id)
      );


      await bulkDeleteVendors(ids);


      setVendors((previous) =>
        previous.filter(
          (vendor) =>
            !ids.includes(
              Number(vendor.id)
            )
        )
      );


      setSelectedIds([]);


      setSuccess(
        `${ids.length} vendor(s) deleted successfully.`
      );

    } catch (err) {

      console.error(
        "Bulk delete error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to delete selected vendors."
        )
      );

    } finally {

      setDeleting(false);
    }
  }


  // =====================================================
  // SEARCH
  // =====================================================

  const filteredVendors = vendors.filter(
    (vendor) => {

      const query = search
        .trim()
        .toLowerCase();

      if (!query) return true;

      return (
        vendor.name
          ?.toLowerCase()
          .includes(query) ||

        vendor.email
          ?.toLowerCase()
          .includes(query) ||

        vendor.phone
          ?.toLowerCase()
          .includes(query) ||

        vendor.address
          ?.toLowerCase()
          .includes(query)
      );
    }
  );


  // =====================================================
  // SELECT ALL STATUS
  // =====================================================

  const visibleIds = filteredVendors.map(
    (vendor) => Number(vendor.id)
  );

  const allVisibleSelected =
    visibleIds.length > 0 &&
    visibleIds.every(
      (id) =>
        selectedIds.includes(id)
    );


  // =====================================================
  // SUMMARY
  // =====================================================

  const vendorsWithEmail =
    vendors.filter(
      (vendor) => vendor.email
    ).length;

  const vendorsWithPhone =
    vendors.filter(
      (vendor) => vendor.phone
    ).length;


  // =====================================================
  // UI
  // =====================================================

  return (

    <div className="vendors-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="vendors-header">

        <div>

          <div className="vendors-eyebrow">
            BUSINESS
          </div>

          <h1>
            Vendors
          </h1>

          <p>
            Manage your suppliers and keep
            vendor information organized.
          </p>

        </div>


        <button
          type="button"
          className="vendors-primary-button"
          onClick={openAddForm}
        >
          <Plus size={17} />
          Add vendor
        </button>

      </div>


      {/* =================================================
          ERROR
      ================================================= */}

      {error && (

        <div className="vendors-error">

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() => setError("")}
          >
            <X size={17} />
          </button>

        </div>

      )}


      {/* =================================================
          SUCCESS
      ================================================= */}

      {success && (

        <div className="vendors-success">

          <span>
            {success}
          </span>

          <button
            type="button"
            onClick={() => setSuccess("")}
          >
            <X size={17} />
          </button>

        </div>

      )}


      {/* =================================================
          SUMMARY
      ================================================= */}

      <section className="vendors-summary">

        <div className="vendor-summary-card">

          <div className="vendor-summary-icon">
            <Building2 size={21} />
          </div>

          <div>

            <span>
              Total vendors
            </span>

            <strong>
              {vendors.length}
            </strong>

          </div>

        </div>


        <div className="vendor-summary-card">

          <div className="vendor-summary-icon">
            <Mail size={21} />
          </div>

          <div>

            <span>
              With email
            </span>

            <strong>
              {vendorsWithEmail}
            </strong>

          </div>

        </div>


        <div className="vendor-summary-card">

          <div className="vendor-summary-icon">
            <Phone size={21} />
          </div>

          <div>

            <span>
              With phone
            </span>

            <strong>
              {vendorsWithPhone}
            </strong>

          </div>

        </div>

      </section>


      {/* =================================================
          MAIN PANEL
      ================================================= */}

      <section className="vendors-panel">


        {/* =================================================
            TOOLBAR
        ================================================= */}

        <div className="vendors-toolbar">

          <div>

            <span className="vendors-panel-eyebrow">
              VENDOR DIRECTORY
            </span>

            <h2>
              All vendors
            </h2>

          </div>


          <div className="vendor-toolbar-right">

            {selectedIds.length > 0 && (

              <button
                type="button"
                className="vendor-bulk-delete-button"
                onClick={handleDeleteSelected}
                disabled={deleting}
              >

                <Trash2 size={16} />

                {deleting
                  ? "Deleting..."
                  : `Delete selected (${selectedIds.length})`}

              </button>

            )}


            <div className="vendor-search">

              <Search size={17} />

              <input
                type="text"
                placeholder="Search vendors..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
              />

            </div>

          </div>

        </div>


        {/* =================================================
            LOADING
        ================================================= */}

        {loading && (

          <div className="vendors-empty">

            <Building2 size={36} />

            <strong>
              Loading vendors...
            </strong>

          </div>

        )}


        {/* =================================================
            EMPTY
        ================================================= */}

        {!loading &&
          filteredVendors.length === 0 && (

            <div className="vendors-empty">

              <div className="vendor-empty-icon">

                <Building2 size={32} />

              </div>

              <h3>

                {search
                  ? "No vendors found"
                  : "No vendors yet"}

              </h3>

              <p>

                {search
                  ? "Try a different search term."
                  : "Add your first vendor to get started."}

              </p>


              {!search && (

                <button
                  type="button"
                  className="vendors-primary-button"
                  onClick={openAddForm}
                >

                  <Plus size={16} />

                  Add vendor

                </button>

              )}

            </div>

          )}


        {/* =================================================
            TABLE
        ================================================= */}

        {!loading &&
          filteredVendors.length > 0 && (

            <div className="vendors-table">


              {/* TABLE HEADER */}

              <div className="vendor-table-header">

                <div className="vendor-select-header">

                  <button
                    type="button"
                    className="vendor-select-button"
                    onClick={toggleSelectAll}
                    title={
                      allVisibleSelected
                        ? "Deselect all"
                        : "Select all"
                    }
                  >

                    {allVisibleSelected ? (
                      <CheckSquare size={17} />
                    ) : (
                      <Square size={17} />
                    )}

                  </button>

                </div>


                <span>
                  Vendor
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


              {/* TABLE ROWS */}

              {filteredVendors.map(
                (vendor) => {

                  const vendorId =
                    Number(vendor.id);

                  const selected =
                    selectedIds.includes(
                      vendorId
                    );


                  return (

                    <div
                      className={`vendor-row ${
                        selected
                          ? "vendor-row-selected"
                          : ""
                      }`}
                      key={vendorId}
                    >


                      {/* CHECKBOX */}

                      <div className="vendor-select-cell">

                        <button
                          type="button"
                          className="vendor-select-button"
                          onClick={() =>
                            toggleVendorSelection(
                              vendorId
                            )
                          }
                          title={
                            selected
                              ? "Deselect vendor"
                              : "Select vendor"
                          }
                        >

                          {selected ? (
                            <CheckSquare size={17} />
                          ) : (
                            <Square size={17} />
                          )}

                        </button>

                      </div>


                      {/* VENDOR */}

                      <div className="vendor-name-cell">

                        <div className="vendor-avatar">

                          {vendor.name
                            ?.charAt(0)
                            ?.toUpperCase() || "V"}

                        </div>

                        <div>

                          <strong>
                            {vendor.name}
                          </strong>

                          <small>
                            Vendor #{vendorId}
                          </small>

                        </div>

                      </div>


                      {/* CONTACT */}

                      <div className="vendor-contact">

                        {vendor.email && (

                          <span>

                            <Mail size={14} />

                            {vendor.email}

                          </span>

                        )}


                        {vendor.phone && (

                          <span>

                            <Phone size={14} />

                            {vendor.phone}

                          </span>

                        )}


                        {!vendor.email &&
                          !vendor.phone && (

                            <small>
                              No contact details
                            </small>

                          )}

                      </div>


                      {/* ADDRESS */}

                      <div className="vendor-address">

                        {vendor.address ? (

                          <>

                            <MapPin size={15} />

                            <span>
                              {vendor.address}
                            </span>

                          </>

                        ) : (

                          <span className="muted">
                            No address
                          </span>

                        )}

                      </div>


                      {/* ACTIONS */}

                      <div className="vendor-actions">

                        <button
                          type="button"
                          title="Edit vendor"
                          onClick={() =>
                            openEditForm(
                              vendor
                            )
                          }
                        >

                          <Pencil size={16} />

                        </button>


                        <button
                          type="button"
                          title="Delete vendor"
                          className="delete"
                          onClick={() =>
                            handleDelete(
                              vendor
                            )
                          }
                          disabled={deleting}
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


      {/* =================================================
          ADD / EDIT MODAL
      ================================================= */}

      {showForm && (

        <div
          className="vendor-modal-overlay"
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
            className="vendor-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >


            {/* MODAL HEADER */}

            <div className="vendor-modal-header">

              <div>

                <span>

                  {editingId !== null
                    ? "VENDOR DETAILS"
                    : "NEW VENDOR"}

                </span>

                <h2>

                  {editingId !== null
                    ? "Edit vendor"
                    : "Add vendor"}

                </h2>

              </div>


              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
              >

                <X size={18} />

              </button>

            </div>


            {/* FORM */}

            <form
              className="vendor-form"
              onSubmit={handleSubmit}
            >


              {/* NAME */}

              <div className="vendor-form-group">

                <label htmlFor="vendor-name">
                  Vendor name *
                </label>

                <input
                  id="vendor-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. ABC Suppliers"
                  minLength={2}
                  maxLength={200}
                  required
                />

              </div>


              {/* EMAIL + PHONE */}

              <div className="vendor-form-grid">

                <div className="vendor-form-group">

                  <label htmlFor="vendor-email">
                    Email
                  </label>

                  <input
                    id="vendor-email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="vendor@example.com"
                  />

                </div>


                <div className="vendor-form-group">

                  <label htmlFor="vendor-phone">
                    Phone
                  </label>

                  <input
                    id="vendor-phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="9876543210"
                  />

                </div>

              </div>


              {/* ADDRESS */}

              <div className="vendor-form-group">

                <label htmlFor="vendor-address">
                  Address
                </label>

                <textarea
                  id="vendor-address"
                  name="address"
                  rows={3}
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Vendor address"
                />

              </div>


              {/* NOTES */}

              <div className="vendor-form-group">

                <label htmlFor="vendor-notes">
                  Notes
                </label>

                <textarea
                  id="vendor-notes"
                  name="notes"
                  rows={3}
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Additional notes"
                />

              </div>


              {/* FORM ERROR */}

              {error && (

                <div className="vendor-form-error">

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


              {/* ACTIONS */}

              <div className="vendor-form-actions">

                <button
                  type="button"
                  className="vendor-cancel-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="vendor-save-button"
                  disabled={saving}
                >

                  {saving
                    ? "Saving..."
                    : editingId !== null
                    ? "Save changes"
                    : "Create vendor"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}