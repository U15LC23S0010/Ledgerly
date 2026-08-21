import api from "./api";

// =========================================================
// GET ANALYTICS SUMMARY
// =========================================================

export const getAnalyticsSummary = (month) => {
  return api.get(
    "/analytics/summary",
    {
      params: {
        month,
      },
    }
  );
};

// =========================================================
// GET CATEGORY SUMMARY
// =========================================================

export const getCategorySummary = (month) => {
  return api.get(
    "/analytics/category-summary",
    {
      params: {
        month,
      },
    }
  );
};

// =========================================================
// GET MONTHLY SUMMARY
// =========================================================

export const getMonthlySummary = () => {
  return api.get(
    "/analytics/monthly-summary"
  );
};