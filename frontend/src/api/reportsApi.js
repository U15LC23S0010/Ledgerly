import api from "./api";

export function getReports() {
  return api.get("/reports/summary");
}