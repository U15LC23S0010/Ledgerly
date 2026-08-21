import api from "./api";

// =========================================================
// GET ACCOUNTS
// =========================================================

export const getAccounts = () => {
  return api.get("/accounts/");
};