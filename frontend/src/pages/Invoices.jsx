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

  /*
   * Currency selected from Settings.
   *
   * IMPORTANT:
   * Invoice amounts are still stored/sent to the backend
   * in the application's base currency (INR).
   *
   * Currency conversion here is for DISPLAY only.
   */
  const [currency, setCurrency] = useState("INR");

  /*
   * Date format selected from Settings.
   *
   * Supported:
   * DD/MM/YYYY
   * MM/DD/YYYY
   * YYYY-MM-DD
   */
  const [dateFormat, setDateFormat] =
    useState("DD/MM/YYYY");

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

  // ============================================================
  // CURRENCY CONFIGURATION
  // ============================================================

  const CURRENCY_CONFIG = {
    INR: {
      code: "INR",
      locale: "en-IN",
      rate: 1,
    },

    USD: {
      code: "USD",
      locale: "en-US",
      rate: 0.01167,
    },

    EUR: {
      code: "EUR",
      locale: "de-DE",
      rate: 0.00996,
    },

    GBP: {
      code: "GBP",
      locale: "en-GB",
      rate: 0.00861,
    },

    JPY: {
      code: "JPY",
      locale: "ja-JP",
      rate: 1.72,
    },

    AUD: {
      code: "AUD",
      locale: "en-AU",
      rate: 0.0178,
    },

    CAD: {
      code: "CAD",
      locale: "en-CA",
      rate: 0.0159,
    },

    SGD: {
      code: "SGD",
      locale: "en-SG",
      rate: 0.0149,
    },

    AED: {
      code: "AED",
      locale: "en-AE",
      rate: 0.0429,
    },
  };

  // ============================================================
  // NORMALIZE CURRENCY
  // ============================================================

  function normalizeCurrency(value) {
    if (value === null || value === undefined) {
      return null;
    }

    let normalized = String(value)
      .trim()
      .toUpperCase();

    if (!normalized) {
      return null;
    }

    const aliases = {
      "$": "USD",
      "US$": "USD",
      "USDOLLAR": "USD",
      "US DOLLAR": "USD",
      "UNITED STATES DOLLAR": "USD",
      "DOLLAR": "USD",

      "€": "EUR",
      "EURO": "EUR",
      "EUROS": "EUR",

      "£": "GBP",
      "POUND": "GBP",
      "POUNDS": "GBP",
      "BRITISH POUND": "GBP",

      "₹": "INR",
      "RUPEE": "INR",
      "RUPEES": "INR",
      "INDIAN RUPEE": "INR",
      "INDIAN RUPEES": "INR",

      "¥": "JPY",
      "YEN": "JPY",
      "JAPANESE YEN": "JPY",

      "AUSTRALIAN DOLLAR": "AUD",
      "CANADIAN DOLLAR": "CAD",
      "SINGAPORE DOLLAR": "SGD",
      "UAE DIRHAM": "AED",
      "DIRHAM": "AED",
    };

    if (aliases[normalized]) {
      normalized = aliases[normalized];
    }

    const extractedCode = normalized.match(
      /\b(INR|USD|EUR|GBP|JPY|AUD|CAD|SGD|AED)\b/
    );

    if (extractedCode) {
      normalized = extractedCode[1];
    }

    return CURRENCY_CONFIG[normalized]
      ? normalized
      : null;
  }

  // ============================================================
  // EXTRACT CURRENCY FROM OBJECT
  // ============================================================

  function findCurrencyInObject(object, depth = 0) {
    if (!object || typeof object !== "object") {
      return null;
    }

    if (depth > 5) {
      return null;
    }

    const directKeys = [
      "currency",
      "currency_code",
      "currencyCode",
      "selectedCurrency",
      "preferredCurrency",
      "defaultCurrency",
      "displayCurrency",
      "baseCurrency",
      "currencySymbol",
    ];

    for (const key of directKeys) {
      if (
        Object.prototype.hasOwnProperty.call(
          object,
          key
        )
      ) {
        const found = normalizeCurrency(
          object[key]
        );

        if (found) {
          return found;
        }
      }
    }

    const nestedKeys = [
      "settings",
      "userSettings",
      "appSettings",
      "preferences",
      "user",
      "profile",
      "data",
    ];

    for (const key of nestedKeys) {
      if (
        object[key] &&
        typeof object[key] === "object"
      ) {
        const found = findCurrencyInObject(
          object[key],
          depth + 1
        );

        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  // ============================================================
  // GET CURRENCY FROM LOCAL STORAGE
  // ============================================================

  function getCurrencyFromStorage() {
    const directKeys = [
      "currency",
      "selectedCurrency",
      "preferredCurrency",
      "userCurrency",
      "currency_code",
      "currencyCode",
      "displayCurrency",
      "defaultCurrency",
    ];

    for (const key of directKeys) {
      try {
        const value = localStorage.getItem(key);

        const normalized = normalizeCurrency(value);

        if (normalized) {
          return normalized;
        }
      } catch (storageError) {
        console.warn(
          `Unable to read localStorage key "${key}"`,
          storageError
        );
      }
    }

    const objectKeys = [
      "settings",
      "userSettings",
      "appSettings",
      "preferences",
      "userPreferences",
      "profile",
      "user",
    ];

    for (const key of objectKeys) {
      try {
        const raw = localStorage.getItem(key);

        if (!raw) {
          continue;
        }

        let parsed;

        try {
          parsed = JSON.parse(raw);
        } catch {
          const directValue =
            normalizeCurrency(raw);

          if (directValue) {
            return directValue;
          }

          continue;
        }

        const found =
          findCurrencyInObject(parsed);

        if (found) {
          return found;
        }
      } catch (storageError) {
        console.warn(
          `Unable to read settings key "${key}"`,
          storageError
        );
      }
    }

    try {
      for (
        let index = 0;
        index < localStorage.length;
        index++
      ) {
        const key = localStorage.key(index);

        if (!key) {
          continue;
        }

        const lowerKey = key.toLowerCase();

        if (
          !lowerKey.includes("setting") &&
          !lowerKey.includes("preference") &&
          !lowerKey.includes("currency")
        ) {
          continue;
        }

        const raw =
          localStorage.getItem(key);

        if (!raw) {
          continue;
        }

        const directValue =
          normalizeCurrency(raw);

        if (directValue) {
          return directValue;
        }

        try {
          const parsed =
            JSON.parse(raw);

          const found =
            findCurrencyInObject(parsed);

          if (found) {
            return found;
          }
        } catch {
          // Ignore invalid JSON.
        }
      }
    } catch (storageError) {
      console.warn(
        "Unable to inspect localStorage.",
        storageError
      );
    }

    return "INR";
  }

  // ============================================================
  // DATE FORMAT
  // ============================================================

  function normalizeDateFormat(value) {
    const allowedFormats = [
      "DD/MM/YYYY",
      "MM/DD/YYYY",
      "YYYY-MM-DD",
    ];

    if (
      typeof value !== "string"
    ) {
      return "DD/MM/YYYY";
    }

    const normalized =
      value.trim().toUpperCase();

    return allowedFormats.includes(
      normalized
    )
      ? normalized
      : "DD/MM/YYYY";
  }

  function getDateFormatFromStorage() {
    /*
     * Primary Settings storage used by Ledgerly.
     *
     * ledgerly_settings = {
     *   ...
     *   dateFormat: "DD/MM/YYYY"
     * }
     */
    try {
      const raw =
        localStorage.getItem(
          "ledgerly_settings"
        );

      if (raw) {
        try {
          const settings =
            JSON.parse(raw);

          const selected =
            normalizeDateFormat(
              settings?.dateFormat
            );

          if (
            settings?.dateFormat &&
            selected
          ) {
            return selected;
          }
        } catch {
          // Ignore malformed JSON.
        }
      }
    } catch (storageError) {
      console.warn(
        "Unable to read ledgerly_settings.",
        storageError
      );
    }

    /*
     * Compatibility with existing date-format storage.
     */
    try {
      const direct =
        localStorage.getItem(
          "ledgerly_date_format"
        );

      if (direct) {
        return normalizeDateFormat(
          direct
        );
      }
    } catch (storageError) {
      console.warn(
        "Unable to read ledgerly_date_format.",
        storageError
      );
    }

    /*
     * Root HTML data attribute compatibility.
     */
    try {
      const rootFormat =
        document.documentElement.getAttribute(
          "data-date-format"
        );

      if (rootFormat) {
        return normalizeDateFormat(
          rootFormat
        );
      }
    } catch {
      // Ignore.
    }

    return "DD/MM/YYYY";
  }

  function loadDateFormat() {
    const selectedFormat =
      getDateFormatFromStorage();

    setDateFormat(
      (previous) =>
        previous === selectedFormat
          ? previous
          : selectedFormat
    );
  }

 // ============================================================
// LOAD CURRENCY
// ============================================================

function loadCurrency() {
  const selectedCurrency = getCurrencyFromStorage();

  setCurrency((previous) =>
    previous === selectedCurrency
      ? previous
      : selectedCurrency
  );
}

// ============================================================
// SETTINGS DISPLAY
// ============================================================

function loadSettingsDisplay() {
  loadCurrency();
}

// ============================================================
// CURRENCY CHANGE LISTENERS
// ============================================================

useEffect(() => {
  loadSettingsDisplay();

  const handleStorageChange = (event) => {
    if (
      !event ||
      !event.key ||
      event.key === "currency" ||
      event.key === "selectedCurrency" ||
      event.key === "preferredCurrency" ||
      event.key === "userCurrency" ||
      event.key === "currency_code" ||
      event.key === "currencyCode" ||
      event.key === "displayCurrency" ||
      event.key === "defaultCurrency" ||
      event.key === "settings" ||
      event.key === "userSettings" ||
      event.key === "appSettings" ||
      event.key === "preferences"
    ) {
      loadSettingsDisplay();
    }
  };

  const handleCurrencyChange = (event) => {
    const eventCurrency =
      event?.detail?.currency ??
      event?.detail?.currency_code ??
      event?.detail?.currencyCode;

    const normalized = normalizeCurrency(eventCurrency);

    if (normalized) {
      setCurrency(normalized);
    } else {
      loadSettingsDisplay();
    }
  };

  window.addEventListener(
    "storage",
    handleStorageChange
  );

  window.addEventListener(
    "currencyChanged",
    handleCurrencyChange
  );

  window.addEventListener(
    "currency-change",
    handleCurrencyChange
  );

  window.addEventListener(
    "settingsChanged",
    handleCurrencyChange
  );

  window.addEventListener(
    "settings-changed",
    handleCurrencyChange
  );

  const interval = setInterval(() => {
    const current = getCurrencyFromStorage();

    setCurrency((previous) =>
      previous === current
        ? previous
        : current
    );
  }, 500);

  return () => {
    window.removeEventListener(
      "storage",
      handleStorageChange
    );

    window.removeEventListener(
      "currencyChanged",
      handleCurrencyChange
    );

    window.removeEventListener(
      "currency-change",
      handleCurrencyChange
    );

    window.removeEventListener(
      "settingsChanged",
      handleCurrencyChange
    );

    window.removeEventListener(
      "settings-changed",
      handleCurrencyChange
    );

    clearInterval(interval);
  };
}, []);

  

  // ============================================================
  // CURRENCY + DATE LISTENERS
  // ============================================================

  useEffect(() => {
    loadSettingsDisplay();

    const handleStorageChange = (
      event
    ) => {
      if (
        !event ||
        !event.key ||
        event.key === "currency" ||
        event.key === "selectedCurrency" ||
        event.key === "preferredCurrency" ||
        event.key === "userCurrency" ||
        event.key === "currency_code" ||
        event.key === "currencyCode" ||
        event.key === "settings" ||
        event.key === "userSettings" ||
        event.key === "appSettings" ||
        event.key === "preferences" ||
        event.key === "ledgerly_settings" ||
        event.key === "ledgerly_date_format"
      ) {
        loadSettingsDisplay();
      }
    };

    const handleCurrencyChange = (
      event
    ) => {
      const eventCurrency =
        event?.detail?.currency ??
        event?.detail?.currency_code ??
        event?.detail?.currencyCode;

      const normalized =
        normalizeCurrency(
          eventCurrency
        );

      if (normalized) {
        setCurrency(normalized);
      } else {
        loadCurrency();
      }
    };

    /*
     * Settings event.
     *
     * Supports:
     * ledgerly-settings-updated
     *
     * detail can contain:
     * { dateFormat: "MM/DD/YYYY" }
     */
    const handleSettingsUpdated = (
      event
    ) => {
      const eventFormat =
        event?.detail?.dateFormat ??
        event?.detail?.settings?.dateFormat;

      if (eventFormat) {
        setDateFormat(
          normalizeDateFormat(
            eventFormat
          )
        );
      } else {
        loadDateFormat();
      }

      const eventCurrency =
        event?.detail?.currency ??
        event?.detail?.settings?.currency;

      const normalized =
        normalizeCurrency(
          eventCurrency
        );

      if (normalized) {
        setCurrency(normalized);
      } else {
        loadCurrency();
      }
    };

    /*
     * Direct date-format event.
     */
    const handleDateFormatChange = (
      event
    ) => {
      const eventFormat =
        event?.detail?.dateFormat ??
        event?.detail?.format ??
        event?.detail;

      if (
        typeof eventFormat ===
        "string"
      ) {
        setDateFormat(
          normalizeDateFormat(
            eventFormat
          )
        );
      } else {
        loadDateFormat();
      }
    };

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    window.addEventListener(
      "currencyChanged",
      handleCurrencyChange
    );

    window.addEventListener(
      "currency-change",
      handleCurrencyChange
    );

    window.addEventListener(
      "settingsChanged",
      handleCurrencyChange
    );

    window.addEventListener(
      "settings-changed",
      handleCurrencyChange
    );

    window.addEventListener(
      "ledgerly-settings-updated",
      handleSettingsUpdated
    );

    window.addEventListener(
      "ledgerly-date-format-changed",
      handleDateFormatChange
    );

    /*
     * Same-tab fallback.
     *
     * localStorage storage events do not fire in the same
     * tab that changed localStorage.
     */
    const interval = setInterval(() => {
      const currentCurrency =
        getCurrencyFromStorage();

      const currentDateFormat =
        getDateFormatFromStorage();

      setCurrency((previous) =>
        previous === currentCurrency
          ? previous
          : currentCurrency
      );

      setDateFormat((previous) =>
        previous === currentDateFormat
          ? previous
          : currentDateFormat
      );
    }, 500);

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange
      );

      window.removeEventListener(
        "currencyChanged",
        handleCurrencyChange
      );

      window.removeEventListener(
        "currency-change",
        handleCurrencyChange
      );

      window.removeEventListener(
        "settingsChanged",
        handleCurrencyChange
      );

      window.removeEventListener(
        "settings-changed",
        handleCurrencyChange
      );

      window.removeEventListener(
        "ledgerly-settings-updated",
        handleSettingsUpdated
      );

      window.removeEventListener(
        "ledgerly-date-format-changed",
        handleDateFormatChange
      );

      clearInterval(interval);
    };
  }, []);

  // ============================================================
  // CURRENCY HELPERS
  // ============================================================

  function getCurrencyConfig() {
    return (
      CURRENCY_CONFIG[currency] ||
      CURRENCY_CONFIG.INR
    );
  }

  function currencyCode() {
    return getCurrencyConfig().code;
  }

  function convertFromINR(value) {
    const amount = Number(value || 0);

    return (
      amount * getCurrencyConfig().rate
    );
  }

  function money(value) {
    const converted =
      convertFromINR(value);

    const config =
      getCurrencyConfig();

    return new Intl.NumberFormat(
      config.locale,
      {
        style: "currency",
        currency: config.code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    ).format(converted);
  }

  // ============================================================
  // LOAD DATA
  // ============================================================

  useEffect(() => {
    loadInvoices();
    loadCustomers();
  }, []);

  async function loadInvoices() {
    try {
      setLoading(true);
      setError("");

      const response =
        await api.get("/invoices/");

      setInvoices(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (err) {
      console.error(
        "Invoices error:",
        err
      );

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

  async function loadCustomers() {
    try {
      const response =
        await api.get("/customers/");

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

  // ============================================================
  // ERROR HANDLING
  // ============================================================

  function getErrorMessage(
    err,
    fallback
  ) {
    const detail =
      err.response?.data?.detail;

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

  // ============================================================
  // FORM HELPERS
  // ============================================================

  function updateForm(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function updateItem(
    index,
    field,
    value
  ) {
    setForm((previous) => {
      const items = [
        ...previous.items,
      ];

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
        items:
          previous.items.filter(
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

    loadSettingsDisplay();
  }

  function closeForm() {
    if (!saving) {
      setShowForm(false);
    }
  }

  // ============================================================
  // CREATE INVOICE
  // ============================================================

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

    if (
      form.due_date <
      form.issue_date
    ) {
      setError(
        "Due date cannot be before issue date."
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

    if (
      formTax < 0 ||
      formDiscount < 0
    ) {
      setError(
        "Tax and discount cannot be negative."
      );
      return;
    }

    if (formTotal < 0) {
      setError(
        "Discount cannot be greater than the subtotal plus tax."
      );
      return;
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
                item.description ||
                  ""
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
        "Creating invoice in base currency INR:",
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

  // ============================================================
  // DELETE
  // ============================================================

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

      setSelectedInvoiceIds(
        (previous) =>
          previous.filter(
            (invoiceId) =>
              invoiceId !== id
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

  // ============================================================
  // BULK SELECTION
  // ============================================================

  function toggleInvoiceSelection(
    id
  ) {
    setSelectedInvoiceIds(
      (previous) => {
        if (
          previous.includes(id)
        ) {
          return previous.filter(
            (invoiceId) =>
              invoiceId !== id
          );
        }

        return [
          ...previous,
          id,
        ];
      }
    );
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
        (invoice) =>
          invoice.id
      )
    );
  }

  // ============================================================
  // DELETE SELECTED
  // ============================================================

  async function deleteSelectedInvoices() {
    if (
      selectedInvoiceIds.length ===
      0
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to delete ${selectedInvoiceIds.length} selected invoice${
          selectedInvoiceIds.length !==
          1
            ? "s"
            : ""
        }?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingSelected(true);
      setError("");

      await Promise.all(
        selectedInvoiceIds.map(
          (id) =>
            api.delete(
              `/invoices/${id}`
            )
        )
      );

      const deletedIds = [
        ...selectedInvoiceIds,
      ];

      setInvoices((previous) =>
        previous.filter(
          (invoice) =>
            !deletedIds.includes(
              invoice.id
            )
        )
      );

      if (
        selectedInvoice &&
        deletedIds.includes(
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

  // ============================================================
  // MARK PAID
  // ============================================================

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

  // ============================================================
  // DATE
  // ============================================================

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    /*
     * Invoice dates from the backend are expected to be
     * YYYY-MM-DD.
     *
     * We intentionally parse the date manually instead of
     * using new Date(value), preventing timezone-related
     * one-day shifts.
     */
    const match = String(value)
      .trim()
      .match(
        /^(\d{4})-(\d{2})-(\d{2})/
      );

    if (!match) {
      /*
       * Fallback for other valid date values.
       */
      const date = new Date(value);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return value;
      }

      const day = String(
        date.getDate()
      ).padStart(2, "0");

      const month = String(
        date.getMonth() + 1
      ).padStart(2, "0");

      const year = String(
        date.getFullYear()
      );

      if (
        dateFormat ===
        "MM/DD/YYYY"
      ) {
        return `${month}/${day}/${year}`;
      }

      if (
        dateFormat ===
        "YYYY-MM-DD"
      ) {
        return `${year}-${month}-${day}`;
      }

      return `${day}/${month}/${year}`;
    }

    const [, year, month, day] =
      match;

    if (
      dateFormat ===
      "MM/DD/YYYY"
    ) {
      return `${month}/${day}/${year}`;
    }

    if (
      dateFormat ===
      "YYYY-MM-DD"
    ) {
      return `${year}-${month}-${day}`;
    }

    return `${day}/${month}/${year}`;
  }

  // ============================================================
  // CUSTOMER
  // ============================================================

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

  // ============================================================
  // INVOICE ITEMS
  // ============================================================

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

  // ============================================================
  // CALCULATIONS
  // ============================================================

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
      getInvoiceSubtotal(invoice) +
      getInvoiceTax(invoice) -
      getInvoiceDiscount(invoice)
    );
  }

  // ============================================================
  // ESCAPE HTML
  // ============================================================

  function escapeHtml(value) {
    return String(value ?? "")
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

  // ============================================================
  // PDF
  // ============================================================

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

      const pdf = new jsPDF({
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

      let position = margin;

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
        `${invoiceNumber}-${currencyCode()}.pdf`
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

  // ============================================================
  // DOWNLOAD HTML
  // ============================================================

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

    const rows = items
      .map((item, index) => {
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
              item.description || ""
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
      })
      .join("");

    const html = `<!DOCTYPE html>
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

    <h1>
      INVOICE
    </h1>
  </div>

  <div class="meta">

    <strong>
      ${escapeHtml(
        invoiceNumber
      )}
    </strong>

    <br>

    Currency:
    ${currencyCode()}

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
  getInvoiceSubtotal(invoice)
)}
</strong>

</div>

<div>
<span>Tax</span>

<strong>
${money(
  getInvoiceTax(invoice)
)}
</strong>

</div>

<div>
<span>Discount</span>

<strong>
-${money(
  getInvoiceDiscount(invoice)
)}
</strong>

</div>

<div class="total">

<span>Total</span>

<strong>
${money(
  getInvoiceTotal(invoice)
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
      `${invoiceNumber}-${currencyCode()}.html`;

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
  }

  // ============================================================
  // FILTER
  // ============================================================

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

  // ============================================================
  // FORM TOTALS
  // ============================================================

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

  // ============================================================
  // LOADING
  // ============================================================

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

  // ============================================================
  // MAIN UI
  // ============================================================

  return (
    <div className="invoices-page">

      {/* HEADER */}

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

          <small
            style={{
              display: "block",
              marginTop: "6px",
              opacity: 0.65,
            }}
          >
            Display currency:{" "}
            {currencyCode()}
            {" • "}
            Date format:{" "}
            {dateFormat}
          </small>

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

      {/* ERROR */}

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

      {/* SEARCH */}

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

            {filteredInvoices.length}{" "}
            invoice
            {filteredInvoices.length !==
            1
              ? "s"
              : ""}

          </div>

          {selectedInvoiceIds.length >
            0 && (
            <button
              type="button"
              className="bulk-delete-button"
              onClick={
                deleteSelectedInvoices
              }
              disabled={
                deletingSelected
              }
            >
              <Trash2 size={16} />

              {deletingSelected
                ? "Deleting..."
                : `Delete selected (${selectedInvoiceIds.length})`}
            </button>
          )}

        </div>

      </div>

      {/* TABLE */}

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
                    filteredInvoices.length >
                      0 &&
                    selectedInvoiceIds.length ===
                      filteredInvoices.length
                  }
                  onChange={
                    toggleSelectAll
                  }
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

                        loadSettingsDisplay();
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

                        loadSettingsDisplay();

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

      {/* ========================================================
          CREATE INVOICE MODAL
      ======================================================== */}

      {showForm && (
        <div
          className="invoice-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !saving
            ) {
              setShowForm(false);
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
                  onChange={(event) =>
                    updateForm(
                      "customer_id",
                      event.target.value
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
                    onChange={(event) =>
                      updateForm(
                        "issue_date",
                        event.target.value
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
                    onChange={(event) =>
                      updateForm(
                        "due_date",
                        event.target.value
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
                          onChange={(event) =>
                            updateItem(
                              index,
                              "description",
                              event.target.value
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
                          onChange={(event) =>
                            updateItem(
                              index,
                              "quantity",
                              event.target.value
                            )
                          }
                          required
                        />

                      </div>

                      <div className="form-group item-price">

                        <label>
                          Unit price (
                          {currencyCode()}
                          )
                        </label>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            item.unit_price
                          }
                          onChange={(event) =>
                            updateItem(
                              index,
                              "unit_price",
                              event.target.value
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
                    onChange={(event) =>
                      updateForm(
                        "tax",
                        event.target.value
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
                    onChange={(event) =>
                      updateForm(
                        "discount",
                        event.target.value
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
                  onChange={(event) =>
                    updateForm(
                      "notes",
                      event.target.value
                    )
                  }
                />

              </div>

              {/* SUMMARY */}

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

              {/* ACTIONS */}

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

      {/* ========================================================
          INVOICE PREVIEW
      ======================================================== */}

      {showInvoice &&
        selectedInvoice && (
          <div className="invoice-modal-overlay">

            <div className="invoice-preview-wrapper">

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

                  <small>
                    Currency:{" "}
                    {currencyCode()}
                    {" • "}
                    Date format:{" "}
                    {dateFormat}
                  </small>

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

              {/* PRINTABLE INVOICE */}

              <div
                className="printable-invoice"
                ref={
                  invoicePrintRef
                }
              >

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
                      Currency:{" "}
                      {currencyCode()}
                    </div>

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

                {/* ITEMS */}

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
                                {quantity}
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
                    Generated by Ledgerly
                  </div>

                </div>

              </div>

            </div>

          </div>
        )}

    </div>
  );
}