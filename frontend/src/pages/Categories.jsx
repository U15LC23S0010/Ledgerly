import { useEffect, useMemo, useState } from "react";
import {
  Tags,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  FolderOpen,
  CheckCircle,
} from "lucide-react";

import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../api/categoriesApi";
import "./Categories.css";

const EMPTY_FORM = {
  name: "",
};

export default function Categories() {
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    ...EMPTY_FORM,
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
            : item?.msg ||
              item?.message ||
              "Validation error"
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

    return fallback;
  }

  // =====================================================
  // LOAD CATEGORIES
  // =====================================================

  async function loadCategories() {
    try {
      setLoading(true);
      setError("");

      const response =
        await getCategories();

      setCategories(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (err) {
      console.error(
        "Categories error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to load categories."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  // =====================================================
  // OPEN ADD
  // =====================================================

  function openAddForm() {
    setEditingId(null);

    setForm({
      ...EMPTY_FORM,
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  // =====================================================
  // OPEN EDIT
  // =====================================================

  function openEditForm(category) {
    setEditingId(category.id);

    setForm({
      name: category.name || "",
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

    setForm({
      ...EMPTY_FORM,
    });

    setError("");
  }

  // =====================================================
  // INPUT
  // =====================================================

  function handleChange(event) {
    const { name, value } =
      event.target;

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

    const name =
      form.name.trim();

    if (!name) {
      setError(
        "Category name is required."
      );
      return;
    }

    if (name.length < 2) {
      setError(
        "Category name must contain at least 2 characters."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name,
      };

      if (editingId !== null) {
        await updateCategory(
          editingId,
          payload
        );

        setSuccess(
          "Category updated successfully."
        );
      } else {
        await createCategory(payload);

        setSuccess(
          "Category created successfully."
        );
      }

      await loadCategories();

      setShowForm(false);
      setEditingId(null);

      setForm({
        ...EMPTY_FORM,
      });
    } catch (err) {
      console.error(
        "Save category error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to save category."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // DELETE
  // =====================================================

  async function handleDelete(category) {
    const confirmed =
      window.confirm(
        `Delete "${category.name}"?\n\nExisting expenses using this category may prevent deletion.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await deleteCategory(
        category.id
      );

      setCategories(
        (previous) =>
          previous.filter(
            (item) =>
              item.id !==
              category.id
          )
      );

      setSuccess(
        "Category deleted successfully."
      );
    } catch (err) {
      console.error(
        "Delete category error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to delete category."
        )
      );
    }
  }

  // =====================================================
  // SEARCH
  // =====================================================

  const filteredCategories =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return categories;
      }

      return categories.filter(
        (category) =>
          String(
            category.name || ""
          )
            .toLowerCase()
            .includes(query)
      );
    }, [categories, search]);

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="categories-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="categories-header">

        <div>

          <div className="categories-eyebrow">
            ORGANIZATION
          </div>

          <h1>
            Categories
          </h1>

          <p>
            Organize income and expenses
            with custom categories.
          </p>

        </div>

        <button
          type="button"
          className="categories-primary-button"
          onClick={openAddForm}
        >
          <Plus size={17} />
          Add category
        </button>

      </div>


      {/* =================================================
          ERROR
      ================================================= */}

      {error && !showForm && (
        <div className="categories-error">

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


      {/* =================================================
          SUCCESS
      ================================================= */}

      {success && !showForm && (
        <div className="categories-success">

          <CheckCircle size={17} />

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


      {/* =================================================
          SUMMARY
      ================================================= */}

      <section className="categories-summary">

        <div className="category-summary-card">

          <div className="category-summary-icon">
            <Tags size={21} />
          </div>

          <div>
            <span>
              Total categories
            </span>

            <strong>
              {categories.length}
            </strong>
          </div>

        </div>

        <div className="category-summary-card">

          <div className="category-summary-icon">
            <FolderOpen size={21} />
          </div>

          <div>
            <span>
              Showing
            </span>

            <strong>
              {filteredCategories.length}
            </strong>
          </div>

        </div>

      </section>


      {/* =================================================
          CATEGORY PANEL
      ================================================= */}

      <section className="categories-panel">

        <div className="categories-toolbar">

          <div>

            <span className="categories-panel-eyebrow">
              CATEGORY DIRECTORY
            </span>

            <h2>
              All categories
            </h2>

          </div>


          <div className="categories-search">

            <Search size={17} />

            <input
              type="text"
              placeholder="Search categories..."
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
                className="categories-search-clear"
                onClick={() =>
                  setSearch("")
                }
              >
                <X size={15} />
              </button>
            )}

          </div>

        </div>


        {/* =================================================
            LOADING
        ================================================= */}

        {loading && (
          <div className="categories-loading">

            <div className="category-spinner" />

            <p>
              Loading categories...
            </p>

          </div>
        )}


        {/* =================================================
            EMPTY
        ================================================= */}

        {!loading &&
          filteredCategories.length ===
            0 && (

            <div className="categories-empty">

              <div className="category-empty-icon">

                {search ? (
                  <Search size={30} />
                ) : (
                  <Tags size={30} />
                )}

              </div>

              <h3>
                {search
                  ? "No categories found"
                  : "No categories yet"}
              </h3>

              <p>
                {search
                  ? "Try a different search term."
                  : "Create your first category to organize your transactions."}
              </p>

              {!search && (
                <button
                  type="button"
                  className="categories-primary-button"
                  onClick={
                    openAddForm
                  }
                >
                  <Plus size={16} />
                  Add category
                </button>
              )}

            </div>
          )}


        {/* =================================================
            TABLE
        ================================================= */}

        {!loading &&
          filteredCategories.length >
            0 && (

            <div className="categories-table">

              <div className="category-table-header">

                <span>
                  Category
                </span>

                <span>
                  ID
                </span>

                <span>
                  Actions
                </span>

              </div>


              {filteredCategories.map(
                (category) => (

                  <div
                    className="category-row"
                    key={category.id}
                  >

                    <div className="category-name-cell">

                      <div className="category-icon">
                        <Tags size={17} />
                      </div>

                      <div>

                        <strong>
                          {category.name}
                        </strong>

                        <small>
                          Expense category
                        </small>

                      </div>

                    </div>


                    <span className="category-id">
                      #{category.id}
                    </span>


                    <div className="category-actions">

                      <button
                        type="button"
                        title="Edit category"
                        onClick={() =>
                          openEditForm(
                            category
                          )
                        }
                      >
                        <Pencil
                          size={16}
                        />
                      </button>

                      <button
                        type="button"
                        title="Delete category"
                        className="delete"
                        onClick={() =>
                          handleDelete(
                            category
                          )
                        }
                      >
                        <Trash2
                          size={16}
                        />
                      </button>

                    </div>

                  </div>

                )
              )}

            </div>
          )}

      </section>


      {/* =================================================
          ADD / EDIT MODAL
      ================================================= */}

      {showForm && (

        <div
          className="category-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
                event.currentTarget &&
              !saving
            ) {
              closeForm();
            }

          }}
        >

          <div
            className="category-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="category-modal-header">

              <div>

                <span>
                  {editingId !== null
                    ? "CATEGORY DETAILS"
                    : "NEW CATEGORY"}
                </span>

                <h2>
                  {editingId !== null
                    ? "Edit category"
                    : "Add category"}
                </h2>

              </div>

              <button
                type="button"
                onClick={
                  closeForm
                }
                disabled={saving}
              >
                <X size={18} />
              </button>

            </div>


            <form
              className="category-form"
              onSubmit={
                handleSubmit
              }
            >

              <div className="category-form-group">

                <label htmlFor="category-name">
                  Category name *
                </label>

                <input
                  id="category-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Marketing"
                  minLength={2}
                  maxLength={100}
                  required
                  autoFocus
                />

              </div>


              {error && (
                <div className="category-form-error">

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


              <div className="category-form-footer">

                <button
                  type="button"
                  className="category-cancel-button"
                  onClick={
                    closeForm
                  }
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="categories-primary-button"
                  disabled={saving}
                >

                  {saving ? (
                    <>
                      <span className="category-button-spinner" />
                      {editingId !== null
                        ? "Updating..."
                        : "Saving..."}
                    </>
                  ) : (
                    <>
                      {editingId !== null ? (
                        <Pencil size={16} />
                      ) : (
                        <Plus size={16} />
                      )}

                      {editingId !== null
                        ? "Update category"
                        : "Save category"}
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
