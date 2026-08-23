import api from "./api";

/*
=========================================================
REPORTS API
=========================================================
*/

// Get complete financial report data
export function getReports() {
  return api.get("/reports/summary");
}