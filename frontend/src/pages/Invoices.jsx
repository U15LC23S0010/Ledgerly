import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Plus,
  Search,
  X,
  Trash2,
  Eye,
  CheckCircle,
  Printer,
  Download,
} from "lucide-react";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import api from "../api/api";
import "./Invoices.css";

export default function Invoices() {
  const invoicePrintRef = useRef(null);

  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const [deletingSelected, setDeletingSelected] = useState(false);


  const [showForm, setShowForm] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [form, setForm] = useState({
    customer_id: "",
    issue_date: new Date().toISOString().split("T")[0],
    due_date: "",
    tax: 0,
    discount: 0,
    notes: "",
    items: [
      {
        description: "",
        quantity: 1,
        unit_price: 0,
      },
    ],
  });

  useEffect(() => {
    loadInvoices();
    loadCustomers();
  }, []);

  // =====================================================
  // LOAD INVOICES
  // =====================================================

  async function loadInvoices() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/invoices/");

      setInvoices(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (err) {
      console.error("Invoices error:", err);

      setError(
        getErrorMessage(
          err,
          "Unable to load invoices."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // LOAD CUSTOMERS
  // =====================================================

  async function loadCustomers() {
    try {
      const response = await api.get("/customers/");

      setCustomers(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (err) {
      console.error(
        "Customers loading error:",
        err
      );
    }
  }

  // =====================================================
  // ERROR MESSAGE
  // =====================================================

  function getErrorMessage(err, fallback) {
    const detail = err.response?.data?.detail;

    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          return (
            item?.msg ||
            "Validation error"
          );
        })
        .join(", ");
    }

    if (typeof detail === "string") {
      return detail;
    }

    if (
      detail &&
      typeof detail === "object"
    ) {
      return (
        detail.msg ||
        detail.message ||
        fallback
      );
    }

    return fallback;
  }

  // =====================================================
  // FORM HELPERS
  // =====================================================

  function updateForm(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function updateItem(index, field, value) {
    setForm((previous) => {
      const items = [...previous.items];

      items[index] = {
        ...items[index],
        [field]: value,
      };

      return {
        ...previous,
        items,
      };
    });
  }

  function addItem() {
    setForm((previous) => ({
      ...previous,
      items: [
        ...previous.items,
        {
          description: "",
          quantity: 1,
          unit_price: 0,
        },
      ],
    }));
  }

  function removeItem(index) {
    setForm((previous) => {
      if (previous.items.length === 1) {
        return previous;
      }

      return {
        ...previous,
        items: previous.items.filter(
          (_, itemIndex) =>
            itemIndex !== index
        ),
      };
    });
  }

  function resetForm() {
    setForm({
      customer_id: "",
      issue_date: new Date()
        .toISOString()
        .split("T")[0],
      due_date: "",
      tax: 0,
      discount: 0,
      notes: "",
      items: [
        {
          description: "",
          quantity: 1,
          unit_price: 0,
        },
      ],
    });
  }

  function openCreateForm() {
    resetForm();
    setError("");
    setShowInvoice(false);
    setSelectedInvoice(null);
    setShowForm(true);
  }

  function closeForm() {
    if (!saving) {
      setShowForm(false);
    }
  }

  // =====================================================
  // CREATE INVOICE
  // =====================================================

  async function createInvoice(event) {
    event.preventDefault();

    if (!form.customer_id) {
      setError(
        "Please select a customer."
      );
      return;
    }

    if (!form.issue_date) {
      setError(
        "Please select an issue date."
      );
      return;
    }

    if (!form.due_date) {
      setError(
        "Please select a due date."
      );
      return;
    }

    for (const item of form.items) {
      if (
        !String(
          item.description || ""
        ).trim()
      ) {
        setError(
          "Every invoice item needs a description."
        );
        return;
      }

      if (
        Number(item.quantity) <= 0 ||
        Number(item.unit_price) < 0
      ) {
        setError(
          "Enter valid quantity and unit price."
        );
        return;
      }
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        customer_id: Number(
          form.customer_id
        ),

        issue_date:
          form.issue_date,

        due_date:
          form.due_date,

        tax: Number(
          form.tax || 0
        ),

        discount: Number(
          form.discount || 0
        ),

        notes:
          String(
            form.notes || ""
          ).trim() || null,

        items: form.items.map(
          (item) => ({
            description:
              String(
                item.description || ""
              ).trim(),

            quantity: Number(
              item.quantity
            ),

            unit_price: Number(
              item.unit_price
            ),
          })
        ),
      };

      console.log(
        "Creating invoice:",
        payload
      );

      const response =
        await api.post(
          "/invoices/",
          payload
        );

      const createdInvoice =
        response.data?.invoice ||
        response.data;

      setShowForm(false);

      resetForm();

      await loadInvoices();

      setSelectedInvoice(
        createdInvoice
      );

      setShowInvoice(true);
    } catch (err) {
      console.error(
        "Create invoice error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to create invoice."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // DELETE
  // =====================================================

  async function deleteInvoice(id) {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this invoice?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await api.delete(
        `/invoices/${id}`
      );

      setInvoices((previous) =>
        previous.filter(
          (invoice) =>
            invoice.id !== id
        )
      );

      if (
        selectedInvoice?.id === id
      ) {
        setSelectedInvoice(null);
        setShowInvoice(false);
      }
    } catch (err) {
      console.error(
        "Delete invoice error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to delete invoice."
        )
      );
    }
  }

  // =====================================================
// BULK SELECTION
// =====================================================

function toggleInvoiceSelection(id) {
  setSelectedInvoiceIds((previous) => {
    if (previous.includes(id)) {
      return previous.filter(
        (invoiceId) => invoiceId !== id
      );
    }

    return [...previous, id];
  });
}

function toggleSelectAll() {
  if (
    selectedInvoiceIds.length ===
    filteredInvoices.length
  ) {
    setSelectedInvoiceIds([]);
    return;
  }

  setSelectedInvoiceIds(
    filteredInvoices.map(
      (invoice) => invoice.id
    )
  );
}

function clearSelection() {
  setSelectedInvoiceIds([]);
}

// =====================================================
// DELETE SELECTED INVOICES
// =====================================================

async function deleteSelectedInvoices() {
  if (selectedInvoiceIds.length === 0) {
    return;
  }

  const confirmed = window.confirm(
    `Are you sure you want to delete ${selectedInvoiceIds.length} selected invoice${
      selectedInvoiceIds.length !== 1 ? "s" : ""
    }?`
  );

  if (!confirmed) {
    return;
  }

  try {
    setDeletingSelected(true);
    setError("");

    await Promise.all(
      selectedInvoiceIds.map((id) =>
        api.delete(`/invoices/${id}`)
      )
    );

    setInvoices((previous) =>
      previous.filter(
        (invoice) =>
          !selectedInvoiceIds.includes(
            invoice.id
          )
      )
    );

    if (
      selectedInvoice &&
      selectedInvoiceIds.includes(
        selectedInvoice.id
      )
    ) {
      setSelectedInvoice(null);
      setShowInvoice(false);
    }

    setSelectedInvoiceIds([]);
  } catch (err) {
    console.error(
      "Delete selected invoices error:",
      err
    );

    setError(
      getErrorMessage(
        err,
        "Unable to delete selected invoices."
      )
    );
  } finally {
    setDeletingSelected(false);
  }
}


  // =====================================================
  // MARK PAID
  // =====================================================

  async function markPaid(id) {
    try {
      setError("");

      await api.patch(
        `/invoices/${id}/status`,
        {
          status: "paid",
        }
      );

      await loadInvoices();

      if (
        selectedInvoice?.id === id
      ) {
        setSelectedInvoice(
          (previous) => ({
            ...previous,
            status: "paid",
          })
        );
      }
    } catch (err) {
      console.error(
        "Update invoice error:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Unable to update invoice status."
        )
      );
    }
  }

  // =====================================================
  // MONEY
  // =====================================================

  function money(value) {
    return `₹${Number(
      value || 0
    ).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  // =====================================================
  // DATE
  // =====================================================

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

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

  // =====================================================
  // CUSTOMER
  // =====================================================

  function getCustomer(id) {
    return customers.find(
      (customer) =>
        Number(customer.id) ===
        Number(id)
    );
  }

  function customerName(id) {
    const customer =
      getCustomer(id);

    return (
      customer?.name ||
      `Customer #${id}`
    );
  }

  // =====================================================
  // INVOICE ITEMS
  // =====================================================

  function getInvoiceItems(
    invoice
  ) {
    if (
      Array.isArray(
        invoice?.items
      )
    ) {
      return invoice.items;
    }

    if (
      Array.isArray(
        invoice?.invoice_items
      )
    ) {
      return invoice.invoice_items;
    }

    return [];
  }

  // =====================================================
  // INVOICE CALCULATIONS
  // =====================================================

  function getInvoiceSubtotal(
    invoice
  ) {
    const items =
      getInvoiceItems(invoice);

    if (items.length > 0) {
      return items.reduce(
        (sum, item) =>
          sum +
          Number(
            item.quantity || 0
          ) *
            Number(
              item.unit_price ??
                item.rate ??
                0
            ),
        0
      );
    }

    return Number(
      invoice?.subtotal || 0
    );
  }

  function getInvoiceTax(
    invoice
  ) {
    return Number(
      invoice?.tax || 0
    );
  }

  function getInvoiceDiscount(
    invoice
  ) {
    return Number(
      invoice?.discount || 0
    );
  }

  function getInvoiceTotal(
    invoice
  ) {
    if (
      invoice?.total !==
        undefined &&
      invoice?.total !== null
    ) {
      return Number(
        invoice.total
      );
    }

    return (
      getInvoiceSubtotal(
        invoice
      ) +
      getInvoiceTax(invoice) -
      getInvoiceDiscount(invoice)
    );
  }

  // =====================================================
  // ESCAPE HTML
  // =====================================================

  function escapeHtml(value) {
    return String(
      value ?? ""
    )
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );
  }

  // =====================================================
  // DOWNLOAD PDF
  // =====================================================

  async function downloadInvoicePDF() {
    if (
      !invoicePrintRef.current ||
      !selectedInvoice
    ) {
      return;
    }

    try {
      setError("");

      const element =
        invoicePrintRef.current;

      const canvas =
        await html2canvas(
          element,
          {
            scale: 2,
            useCORS: true,
            backgroundColor:
              "#ffffff",
            logging: false,
          }
        );

      const imageData =
        canvas.toDataURL(
          "image/png"
        );

      const pdf =
        new jsPDF({
          orientation:
            "portrait",
          unit: "mm",
          format: "a4",
        });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;

      const usableWidth =
        pageWidth -
        margin * 2;

      const imageHeight =
        (canvas.height *
          usableWidth) /
        canvas.width;

      const usablePageHeight =
        pageHeight -
        margin * 2;

      let remainingHeight =
        imageHeight;

      let position =
        margin;

      pdf.addImage(
        imageData,
        "PNG",
        margin,
        position,
        usableWidth,
        imageHeight
      );

      remainingHeight -=
        usablePageHeight;

      while (
        remainingHeight > 0
      ) {
        position =
          margin -
          (imageHeight -
            remainingHeight);

        pdf.addPage();

        pdf.addImage(
          imageData,
          "PNG",
          margin,
          position,
          usableWidth,
          imageHeight
        );

        remainingHeight -=
          usablePageHeight;
      }

      const invoiceNumber =
        selectedInvoice.invoice_number ||
        `INV-${String(
          selectedInvoice.id
        ).padStart(4, "0")}`;

      pdf.save(
        `${invoiceNumber}.pdf`
      );
    } catch (err) {
      console.error(
        "PDF download error:",
        err
      );

      setError(
        "Unable to generate the invoice PDF."
      );
    }
  }

  // =====================================================
  // DOWNLOAD HTML FALLBACK
  // =====================================================

  function downloadInvoice(
    invoice
  ) {
    const customer =
      getCustomer(
        invoice.customer_id
      );

    const items =
      getInvoiceItems(invoice);

    const invoiceNumber =
      invoice.invoice_number ||
      `INV-${String(
        invoice.id
      ).padStart(4, "0")}`;

    const rows =
      items
        .map(
          (item, index) => {
            const quantity =
              Number(
                item.quantity || 0
              );

            const unitPrice =
              Number(
                item.unit_price ??
                  item.rate ??
                  0
              );

            return `
              <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(
                  item.description ||
                    ""
                )}</td>
                <td>${quantity}</td>
                <td>${money(
                  unitPrice
                )}</td>
                <td>${money(
                  quantity *
                    unitPrice
                )}</td>
              </tr>
            `;
          }
        )
        .join("");

    const html =
      `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${escapeHtml(
        invoiceNumber
      )}</title>
<style>
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 40px;
  color: #202124;
  background: #ffffff;
}

.invoice {
  max-width: 850px;
  margin: auto;
  border: 1px solid #ddd;
  padding: 40px;
}

.header {
  display: flex;
  justify-content: space-between;
  border-bottom: 2px solid #222;
  padding-bottom: 24px;
}

h1 {
  margin: 0 0 8px;
  font-size: 30px;
}

.muted {
  color: #666;
}

.meta {
  text-align: right;
}

.customer {
  margin: 28px 0;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 25px;
}

th,
td {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: left;
}

th {
  background: #f4f4f4;
}

td:nth-child(1),
td:nth-child(3) {
  text-align: center;
}

.summary {
  margin-left: auto;
  width: 320px;
  margin-top: 25px;
}

.summary div {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}

.total {
  font-size: 20px;
  font-weight: bold;
  border-top: 2px solid #222;
  margin-top: 8px;
  padding-top: 12px;
}

.notes {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #ddd;
}

@media print {
  body {
    padding: 0;
  }

  .invoice {
    border: 0;
  }
}
</style>
</head>
<body>
<div class="invoice">

<div class="header">
  <div>
    <div class="muted">
      LEDGERFLOW AI
    </div>
    <h1>INVOICE</h1>
  </div>

  <div class="meta">
    <strong>${escapeHtml(
      invoiceNumber
    )}</strong>
    <br>
    Issue date:
    ${formatDate(
      invoice.issue_date
    )}
    <br>
    Due date:
    ${formatDate(
      invoice.due_date
    )}
  </div>
</div>

<div class="customer">
  <strong>BILL TO</strong>
  <br>
  ${escapeHtml(
    customer?.name ||
      customerName(
        invoice.customer_id
      )
  )}
  <br>
  ${escapeHtml(
    customer?.email || ""
  )}
  <br>
  ${escapeHtml(
    customer?.phone || ""
  )}
  <br>
  ${escapeHtml(
    customer?.address || ""
  )}
</div>

<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Description</th>
      <th>Qty</th>
      <th>Unit price</th>
      <th>Amount</th>
    </tr>
  </thead>

  <tbody>
    ${rows}
  </tbody>
</table>

<div class="summary">

  <div>
    <span>Subtotal</span>
    <strong>
      ${money(
        getInvoiceSubtotal(
          invoice
        )
      )}
    </strong>
  </div>

  <div>
    <span>Tax</span>
    <strong>
      ${money(
        getInvoiceTax(
          invoice
        )
      )}
    </strong>
  </div>

  <div>
    <span>Discount</span>
    <strong>
      -${money(
        getInvoiceDiscount(
          invoice
        )
      )}
    </strong>
  </div>

  <div class="total">
    <span>Total</span>
    <strong>
      ${money(
        getInvoiceTotal(
          invoice
        )
      )}
    </strong>
  </div>

</div>

${
  invoice.notes
    ? `
      <div class="notes">
        <strong>Notes</strong>
        <p>
          ${escapeHtml(
            invoice.notes
          )}
        </p>
      </div>
    `
    : ""
}

</div>
</body>
</html>`;

    const blob =
      new Blob(
        [html],
        {
          type:
            "text/html;charset=utf-8",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;
    link.download =
      `${invoiceNumber}.html`;

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(
      url
    );
  }

  // =====================================================
  // FILTERED INVOICES
  // =====================================================

  const filteredInvoices =
    invoices.filter(
      (invoice) => {
        const text = `
          ${invoice.invoice_number || ""}
          ${invoice.status || ""}
          ${customerName(
            invoice.customer_id
          )}
        `.toLowerCase();

        return text.includes(
          search
            .trim()
            .toLowerCase()
        );
      }
    );

  // =====================================================
  // FORM TOTALS
  // =====================================================

  const formSubtotal =
    form.items.reduce(
      (sum, item) =>
        sum +
        Number(
          item.quantity || 0
        ) *
          Number(
            item.unit_price || 0
          ),
      0
    );

  const formTax =
    Number(form.tax || 0);

  const formDiscount =
    Number(
      form.discount || 0
    );

  const formTotal =
    formSubtotal +
    formTax -
    formDiscount;

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="invoices-page">

        <div className="invoice-loading">

          <div className="loading-spinner" />

          <h2>
            Loading invoices...
          </h2>

          <p>
            Connecting to your
            LedgerFlow workspace.
          </p>

        </div>

      </div>
    );
  }

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <div className="invoices-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="invoices-header">

        <div>

          <div className="invoice-eyebrow">
            BUSINESS
          </div>

          <h1>
            Invoices
          </h1>

          <p>
            Create and manage
            professional invoices
            for your customers.
          </p>

        </div>

        <button
          type="button"
          className="primary-button"
          onClick={
            openCreateForm
          }
        >
          <Plus size={18} />
          Create invoice
        </button>

      </div>


      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="invoice-error">

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
          >
            <X size={18} />
          </button>

        </div>
      )}


      {/* =================================================
          SEARCH
      ================================================= */}

      <div className="invoice-toolbar">

  <div className="search-box">

    <Search size={18} />

    <input
      type="text"
      placeholder="Search invoices..."
      value={search}
      onChange={(event) =>
        setSearch(
          event.target.value
        )
      }
    />

  </div>

  <div className="invoice-toolbar-right">

    <div className="invoice-count">

      {filteredInvoices.length}

      {" "}

      invoice
      {filteredInvoices.length !== 1
        ? "s"
        : ""}

    </div>

    {selectedInvoiceIds.length > 0 && (
      <button
        type="button"
        className="bulk-delete-button"
        onClick={
          deleteSelectedInvoices
        }
        disabled={deletingSelected}
      >
        <Trash2 size={16} />

        {deletingSelected
          ? "Deleting..."
          : `Delete selected (${selectedInvoiceIds.length})`}
      </button>
    )}

  </div>

</div>

      {/* =================================================
          INVOICE TABLE
      ================================================= */}

      <section className="invoice-panel">

        {filteredInvoices.length ===
        0 ? (

          <div className="invoice-empty">

            <div className="empty-icon">
              <FileText />
            </div>

            <h2>
              No invoices found
            </h2>

            <p>
              Create your first
              invoice to start
              managing customer
              billing.
            </p>

            <button
              type="button"
              className="primary-button"
              onClick={
                openCreateForm
              }
            >
              <Plus size={18} />
              Create invoice
            </button>

          </div>

        ) : (

          <div className="invoice-table">

            <div className="invoice-table-head">

  <span className="invoice-select-column">

    <input
      type="checkbox"
      checked={
        filteredInvoices.length > 0 &&
        selectedInvoiceIds.length ===
          filteredInvoices.length
      }
      onChange={toggleSelectAll}
      aria-label="Select all invoices"
    />

  </span>

  <span>
    Invoice
  </span>

              <span>
                Customer
              </span>

              <span>
                Issue date
              </span>

              <span>
                Due date
              </span>

              <span>
                Status
              </span>

              <span>
                Total
              </span>

              <span>
                Actions
              </span>

            </div>


            {filteredInvoices.map(
              (invoice) => (

                <div
                  className="invoice-row"
                  key={invoice.id}
                >

              <span className="invoice-select-column">

  <input
    type="checkbox"
    checked={selectedInvoiceIds.includes(
      invoice.id
    )}
    onChange={() =>
      toggleInvoiceSelection(
        invoice.id
      )
    }
    aria-label={`Select ${
      invoice.invoice_number ||
      `INV-${invoice.id}`
    }`}
  />

</span>
                  <strong>
                    {invoice.invoice_number ||
                      `INV-${String(
                        invoice.id
                      ).padStart(
                        4,
                        "0"
                      )}`}
                  </strong>

                  <span>
                    {customerName(
                      invoice.customer_id
                    )}
                  </span>

                  <span>
                    {formatDate(
                      invoice.issue_date
                    )}
                  </span>

                  <span>
                    {formatDate(
                      invoice.due_date
                    )}
                  </span>

                  <span>

                    <em
                      className={`invoice-status ${String(
                        invoice.status ||
                          "draft"
                      ).toLowerCase()}`}
                    >
                      {invoice.status ||
                        "draft"}
                    </em>

                  </span>

                  <b>
                    {money(
                      getInvoiceTotal(
                        invoice
                      )
                    )}
                  </b>


                  <div className="invoice-actions">

                    {invoice.status !==
                      "paid" && (

                      <button
                        type="button"
                        title="Mark as paid"
                        onClick={() =>
                          markPaid(
                            invoice.id
                          )
                        }
                      >
                        <CheckCircle
                          size={17}
                        />
                      </button>

                    )}


                    <button
                      type="button"
                      title="View invoice"
                      onClick={() => {
                        setSelectedInvoice(
                          invoice
                        );

                        setShowInvoice(
                          true
                        );
                      }}
                    >
                      <Eye size={17} />
                    </button>


                    <button
                      type="button"
                      title="Download invoice PDF"
                      className="invoice-download-button"
                      onClick={() => {
                        setSelectedInvoice(
                          invoice
                        );

                        setShowInvoice(
                          true
                        );

                        setTimeout(
                          () => {
                            downloadInvoicePDF();
                          },
                          300
                        );
                      }}
                    >
                      <Download
                        size={17}
                      />
                    </button>


                    <button
                      type="button"
                      title="Delete invoice"
                      className="delete-action"
                      onClick={() =>
                        deleteInvoice(
                          invoice.id
                        )
                      }
                    >
                      <Trash2
                        size={17}
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
          CREATE INVOICE MODAL
      ================================================= */}

      {showForm && (

        <div
          className="invoice-modal-overlay"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
                event.currentTarget &&
              !saving
            ) {
              setShowForm(
                false
              );
            }
          }}
        >

          <div className="invoice-modal">

            <div className="invoice-modal-header">

              <div>

                <span>
                  NEW INVOICE
                </span>

                <h2>
                  Create invoice
                </h2>

              </div>

              <button
                type="button"
                onClick={
                  closeForm
                }
                disabled={saving}
              >
                <X size={19} />
              </button>

            </div>


            <form
              className="invoice-form"
              onSubmit={
                createInvoice
              }
            >

              {/* CUSTOMER */}

              <div className="form-group">

                <label htmlFor="customer_id">
                  Customer
                </label>

                <select
                  id="customer_id"
                  value={
                    form.customer_id
                  }
                  onChange={(
                    event
                  ) =>
                    updateForm(
                      "customer_id",
                      event.target
                        .value
                    )
                  }
                  required
                >

                  <option value="">
                    Select customer
                  </option>

                  {customers.map(
                    (customer) => (

                      <option
                        key={
                          customer.id
                        }
                        value={
                          customer.id
                        }
                      >
                        {
                          customer.name
                        }
                      </option>

                    )
                  )}

                </select>

              </div>


              {/* DATES */}

              <div className="form-row">

                <div className="form-group">

                  <label htmlFor="issue_date">
                    Issue date
                  </label>

                  <input
                    id="issue_date"
                    type="date"
                    value={
                      form.issue_date
                    }
                    onChange={(
                      event
                    ) =>
                      updateForm(
                        "issue_date",
                        event.target
                          .value
                      )
                    }
                    required
                  />

                </div>


                <div className="form-group">

                  <label htmlFor="due_date">
                    Due date
                  </label>

                  <input
                    id="due_date"
                    type="date"
                    value={
                      form.due_date
                    }
                    min={
                      form.issue_date
                    }
                    onChange={(
                      event
                    ) =>
                      updateForm(
                        "due_date",
                        event.target
                          .value
                      )
                    }
                    required
                  />

                </div>

              </div>


              {/* ITEMS */}

              <div className="items-header">

                <div>

                  <h3>
                    Invoice items
                  </h3>

                  <p>
                    Add products or
                    services to this
                    invoice.
                  </p>

                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    addItem
                  }
                >
                  <Plus size={16} />
                  Add item
                </button>

              </div>


              <div className="invoice-items-form">

                {form.items.map(
                  (
                    item,
                    index
                  ) => (

                    <div
                      className="invoice-item-form-row"
                      key={index}
                    >

                      <div className="form-group item-description">

                        <label>
                          Description
                        </label>

                        <input
                          type="text"
                          value={
                            item.description
                          }
                          placeholder="Product or service"
                          onChange={(
                            event
                          ) =>
                            updateItem(
                              index,
                              "description",
                              event.target
                                .value
                            )
                          }
                          required
                        />

                      </div>


                      <div className="form-group item-quantity">

                        <label>
                          Qty
                        </label>

                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={
                            item.quantity
                          }
                          onChange={(
                            event
                          ) =>
                            updateItem(
                              index,
                              "quantity",
                              event.target
                                .value
                            )
                          }
                          required
                        />

                      </div>


                      <div className="form-group item-price">

                        <label>
                          Unit price
                        </label>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            item.unit_price
                          }
                          onChange={(
                            event
                          ) =>
                            updateItem(
                              index,
                              "unit_price",
                              event.target
                                .value
                            )
                          }
                          required
                        />

                      </div>


                      <div className="item-line-total">

                        <span>
                          Amount
                        </span>

                        <strong>
                          {money(
                            Number(
                              item.quantity ||
                                0
                            ) *
                              Number(
                                item.unit_price ||
                                  0
                              )
                          )}
                        </strong>

                      </div>


                      <button
                        type="button"
                        className="remove-item-button"
                        onClick={() =>
                          removeItem(
                            index
                          )
                        }
                        disabled={
                          form.items
                            .length ===
                          1
                        }
                        title="Remove item"
                      >
                        <Trash2
                          size={17}
                        />
                      </button>

                    </div>

                  )
                )}

              </div>


              {/* TAX / DISCOUNT */}

              <div className="form-row">

                <div className="form-group">

                  <label htmlFor="tax">
                    Tax
                  </label>

                  <input
                    id="tax"
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.tax
                    }
                    onChange={(
                      event
                    ) =>
                      updateForm(
                        "tax",
                        event.target
                          .value
                      )
                    }
                  />

                </div>


                <div className="form-group">

                  <label htmlFor="discount">
                    Discount
                  </label>

                  <input
                    id="discount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.discount
                    }
                    onChange={(
                      event
                    ) =>
                      updateForm(
                        "discount",
                        event.target
                          .value
                      )
                    }
                  />

                </div>

              </div>


              {/* NOTES */}

              <div className="form-group">

                <label htmlFor="notes">
                  Notes
                </label>

                <textarea
                  id="notes"
                  rows="4"
                  value={
                    form.notes
                  }
                  placeholder="Optional notes for the customer"
                  onChange={(
                    event
                  ) =>
                    updateForm(
                      "notes",
                      event.target
                        .value
                    )
                  }
                />

              </div>


              {/* FORM SUMMARY */}

              <div className="invoice-form-summary">

                <div>
                  <span>
                    Subtotal
                  </span>

                  <strong>
                    {money(
                      formSubtotal
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Tax
                  </span>

                  <strong>
                    {money(
                      formTax
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Discount
                  </span>

                  <strong>
                    -{money(
                      formDiscount
                    )}
                  </strong>
                </div>

                <div className="form-summary-total">

                  <span>
                    Total
                  </span>

                  <strong>
                    {money(
                      formTotal
                    )}
                  </strong>

                </div>

              </div>


              {/* FORM ACTIONS */}

              <div className="invoice-form-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    closeForm
                  }
                  disabled={
                    saving
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    saving
                  }
                >

                  {saving
                    ? "Creating..."
                    : "Create invoice"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* =================================================
          PRINTABLE INVOICE
      ================================================= */}

      {showInvoice &&
        selectedInvoice && (

          <div className="invoice-modal-overlay">

            <div className="invoice-preview-wrapper">

              {/* PREVIEW TOOLBAR */}

              <div className="invoice-preview-toolbar">

                <div>

                  <span className="invoice-preview-label">
                    INVOICE PREVIEW
                  </span>

                  <h2>
                    {selectedInvoice.invoice_number ||
                      `INV-${String(
                        selectedInvoice.id
                      ).padStart(
                        4,
                        "0"
                      )}`}
                  </h2>

                </div>


                <div className="invoice-preview-actions">

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setShowInvoice(
                        false
                      );
                      setSelectedInvoice(
                        null
                      );
                    }}
                  >
                    <X size={17} />
                    Close
                  </button>


                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      window.print()
                    }
                  >
                    <Printer size={17} />
                    Print
                  </button>


                  <button
                    type="button"
                    className="primary-button"
                    onClick={
                      downloadInvoicePDF
                    }
                  >
                    <Download
                      size={17}
                    />
                    Download PDF
                  </button>

                </div>

              </div>


              {/* PRINTABLE DOCUMENT */}

              <div
                className="printable-invoice"
                ref={
                  invoicePrintRef
                }
              >

                {/* HEADER */}

                <div className="printable-invoice-header">

                  <div className="invoice-company">

                    <div className="invoice-company-name">
                      LEDGERFLOW AI
                    </div>

                    <h1>
                      INVOICE
                    </h1>

                  </div>


                  <div className="invoice-number-block">

                    <strong>
                      {selectedInvoice.invoice_number ||
                        `INV-${String(
                          selectedInvoice.id
                        ).padStart(
                          4,
                          "0"
                        )}`}
                    </strong>

                    <div>
                      Issue date:{" "}
                      {formatDate(
                        selectedInvoice.issue_date
                      )}
                    </div>

                    <div>
                      Due date:{" "}
                      {formatDate(
                        selectedInvoice.due_date
                      )}
                    </div>

                  </div>

                </div>


                {/* CUSTOMER */}

                <div className="printable-invoice-customer">

                  <div>

                    <span className="print-section-label">
                      BILL TO
                    </span>

                    <h3>
                      {customerName(
                        selectedInvoice.customer_id
                      )}
                    </h3>

                    {getCustomer(
                      selectedInvoice.customer_id
                    )?.email && (

                      <p>
                        {
                          getCustomer(
                            selectedInvoice.customer_id
                          ).email
                        }
                      </p>

                    )}

                    {getCustomer(
                      selectedInvoice.customer_id
                    )?.phone && (

                      <p>
                        {
                          getCustomer(
                            selectedInvoice.customer_id
                          ).phone
                        }
                      </p>

                    )}

                    {getCustomer(
                      selectedInvoice.customer_id
                    )?.address && (

                      <p>
                        {
                          getCustomer(
                            selectedInvoice.customer_id
                          ).address
                        }
                      </p>

                    )}

                  </div>

                </div>


                {/* ITEMS TABLE */}

                <table className="professional-invoice-table">

                  <thead>

                    <tr>

                      <th>
                        #
                      </th>

                      <th>
                        Description
                      </th>

                      <th>
                        Qty
                      </th>

                      <th>
                        Unit price
                      </th>

                      <th>
                        Amount
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {getInvoiceItems(
                      selectedInvoice
                    ).length > 0 ? (

                      getInvoiceItems(
                        selectedInvoice
                      ).map(
                        (
                          item,
                          index
                        ) => {

                          const quantity =
                            Number(
                              item.quantity ||
                                0
                            );

                          const unitPrice =
                            Number(
                              item.unit_price ??
                                item.rate ??
                                0
                            );

                          const amount =
                            quantity *
                            unitPrice;

                          return (
                            <tr
                              key={
                                item.id ||
                                index
                              }
                            >

                              <td>
                                {index +
                                  1}
                              </td>

                              <td>
                                {
                                  item.description ||
                                  "Item"
                                }
                              </td>

                              <td>
                                {
                                  quantity
                                }
                              </td>

                              <td>
                                {money(
                                  unitPrice
                                )}
                              </td>

                              <td>
                                {money(
                                  amount
                                )}
                              </td>

                            </tr>
                          );
                        }
                      )

                    ) : (

                      <tr>

                        <td colSpan="5">
                          No invoice items
                        </td>

                      </tr>

                    )}

                  </tbody>

                </table>


                {/* SUMMARY */}

                <div className="printable-invoice-summary">

                  <div className="summary-row">

                    <span>
                      Subtotal
                    </span>

                    <strong>
                      {money(
                        getInvoiceSubtotal(
                          selectedInvoice
                        )
                      )}
                    </strong>

                  </div>


                  <div className="summary-row">

                    <span>
                      Tax
                    </span>

                    <strong>
                      {money(
                        getInvoiceTax(
                          selectedInvoice
                        )
                      )}
                    </strong>

                  </div>


                  <div className="summary-row">

                    <span>
                      Discount
                    </span>

                    <strong>
                      -{" "}
                      {money(
                        getInvoiceDiscount(
                          selectedInvoice
                        )
                      )}
                    </strong>

                  </div>


                  <div className="summary-total">

                    <span>
                      Total
                    </span>

                    <strong>
                      {money(
                        getInvoiceTotal(
                          selectedInvoice
                        )
                      )}
                    </strong>

                  </div>

                </div>


                {/* NOTES */}

                {selectedInvoice.notes && (

                  <div className="printable-invoice-notes">

                    <h4>
                      Notes
                    </h4>

                    <p>
                      {
                        selectedInvoice.notes
                      }
                    </p>

                  </div>

                )}


                {/* FOOTER */}

                <div className="printable-invoice-footer">

                  <div>
                    Thank you for your business.
                  </div>

                  <div>
                    Generated by LedgerFlow AI
                  </div>

                </div>

              </div>

            </div>

          </div>

        )}

    </div>
  );
}
