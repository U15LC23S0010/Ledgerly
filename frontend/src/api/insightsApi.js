import api from "./api";

export const getInsights = () => {
  return api.get("/insights/");
};