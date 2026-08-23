import api from "./api";

// =========================================================
// GET AI INSIGHTS
// =========================================================

export const getInsights = () => {
  return api.get("/insights/");
};