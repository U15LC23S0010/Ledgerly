const DATE_FORMAT_KEY = "ledgerly_date_format";

const DEFAULT_DATE_FORMAT = "DD/MM/YYYY";

const VALID_DATE_FORMATS = [
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
];

export function getStoredDateFormat() {
  try {
    const stored =
      localStorage.getItem(DATE_FORMAT_KEY);

    if (
      VALID_DATE_FORMATS.includes(stored)
    ) {
      return stored;
    }

    const settings =
      localStorage.getItem("ledgerly_settings");

    if (settings) {
      const parsed = JSON.parse(settings);

      if (
        VALID_DATE_FORMATS.includes(
          parsed?.dateFormat
        )
      ) {
        return parsed.dateFormat;
      }
    }
  } catch (error) {
    console.error(
      "Unable to read date format:",
      error
    );
  }

  return DEFAULT_DATE_FORMAT;
}

export function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const format = getStoredDateFormat();

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const year = date.getFullYear();

  switch (format) {
    case "MM/DD/YYYY":
      return `${month}/${day}/${year}`;

    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`;

    case "DD/MM/YYYY":
    default:
      return `${day}/${month}/${year}`;
  }
}