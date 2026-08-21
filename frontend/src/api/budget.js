import api from "./api";

// =========================================================
// GET BUDGET HISTORY
// =========================================================

export const getBudgetHistory = () => {
  return api.get("/budget/history");
};

// =========================================================
// GET CURRENT MONTH BUDGET
// =========================================================

export const getBudget = () => {
  return api.get("/budget/");
};

// =========================================================
// GET BUDGET STATUS
// =========================================================

export const getBudgetStatus = () => {
  return api.get("/budget/status");
};

// =========================================================
// GET BUDGET BREAKDOWN
// =========================================================

export const getBudgetBreakdown = () => {
  return api.get("/budget/breakdown");
};

// =========================================================
// GET BUDGET RECOMMENDATION
// =========================================================

export const getBudgetRecommendation = () => {
  return api.get("/budget/recommendation");
};

// =========================================================
// CREATE / UPDATE BUDGET
// =========================================================

export const setBudget = (budgetData) => {
  return api.post("/budget/", budgetData);
};

// =========================================================
// DELETE CURRENT MONTH BUDGET
// =========================================================

export const deleteBudget = () => {
  return api.delete("/budget/");
};