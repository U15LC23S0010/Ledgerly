// src/utils/currency.js

const CURRENCY_CONFIG = {
  INR: {
    locale: "en-IN",
    currency: "INR",
  },

  USD: {
    locale: "en-US",
    currency: "USD",
  },

  EUR: {
    locale: "de-DE",
    currency: "EUR",
  },

  GBP: {
    locale: "en-GB",
    currency: "GBP",
  },
};

export const BASE_CURRENCY = "INR";

export const VALID_CURRENCIES = Object.keys(CURRENCY_CONFIG);

const SETTINGS_KEY = "ledgerly_settings";
const CURRENCY_KEY = "ledgerly_currency";

export function getCurrency() {
  try {
    const settings = localStorage.getItem(SETTINGS_KEY);

    if (settings) {
      const parsed = JSON.parse(settings);

      if (
        parsed?.currency &&
        CURRENCY_CONFIG[parsed.currency]
      ) {
        return parsed.currency;
      }
    }
  } catch (error) {
    console.error("Unable to read Ledgerly settings:", error);
  }

  const storedCurrency =
    localStorage.getItem(CURRENCY_KEY);

  if (CURRENCY_CONFIG[storedCurrency]) {
    return storedCurrency;
  }

  return BASE_CURRENCY;
}

export function formatCurrency(
  value,
  currency = getCurrency()
) {
  const config =
    CURRENCY_CONFIG[currency] ||
    CURRENCY_CONFIG[BASE_CURRENCY];

  const amount = Number(value) || 0;

  return new Intl.NumberFormat(
    config.locale,
    {
      style: "currency",
      currency: config.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  ).format(amount);
}

export function getCurrencySymbol(
  currency = getCurrency()
) {
  const config =
    CURRENCY_CONFIG[currency] ||
    CURRENCY_CONFIG[BASE_CURRENCY];

  return (
    new Intl.NumberFormat(
      config.locale,
      {
        style: "currency",
        currency: config.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }
    )
      .formatToParts(0)
      .find(
        (part) => part.type === "currency"
      )?.value || currency
  );
}