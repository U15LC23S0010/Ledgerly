import api from "./api";

export const getAccounts = () => {
  return api.get("/accounts/");
};