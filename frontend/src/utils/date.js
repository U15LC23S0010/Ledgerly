const DATE_FORMATS = {
  "DD/MM/YYYY": {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  },

  "MM/DD/YYYY": {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  },

  "YYYY-MM-DD": {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  },
};

export function getCurrentDateFormat() {
  try {
    const stored =
      localStorage.getItem("ledgerly_settings");

    if (stored) {
      const settings = JSON.parse(stored);

      if (DATE_FORMATS[settings.dateFormat]) {
        return settings.dateFormat;
      }
    }
  } catch (error) {
    console.error(
      "Unable to read date settings:",
      error
    );
  }

  return "DD/MM/YYYY";
}

export function formatDate(
  value,
  requestedFormat = getCurrentDateFormat()
) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const format =
    DATE_FORMATS[requestedFormat] ||
    DATE_FORMATS["DD/MM/YYYY"];

  /*
   * YYYY-MM-DD needs to be constructed manually
   * so browser locale does not rearrange it.
   */
  if (requestedFormat === "YYYY-MM-DD") {
    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  return new Intl.DateTimeFormat(
    requestedFormat === "MM/DD/YYYY"
      ? "en-US"
      : "en-GB",
    format
  ).format(date);
}