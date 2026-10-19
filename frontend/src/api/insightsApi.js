import api from "./api";

export const getInsights = () => api.get("/insights/");

export const generateAIInsights = () => api.post("/insights/ai");

export const getSpendingForecast = () => api.get("/insights/forecast");

export const askFinancialCopilot = (message) =>
  api.post(
    "/insights/copilot",
    { message },
    { timeout: 60000 }
  );