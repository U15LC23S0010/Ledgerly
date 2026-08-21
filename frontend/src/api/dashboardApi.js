import api from "./api";

// =========================================================
// GET DASHBOARD
// =========================================================

export const getDashboard = (month) => {
  return api.get(
    "/dashboard/",
    {
      params: {
        month,
      },
    }
  );
};