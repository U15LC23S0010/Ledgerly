import api from "./api";

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

export const getMonthlySummary = () => {
  return api.get(
    "/analytics/monthly-summary"
  );
};