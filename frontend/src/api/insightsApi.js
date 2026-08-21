import api from "./axios";

// =========================================================
// GET AI INSIGHTS
// =========================================================

export const getInsights = () => {
  return api.get("/insights/");
};