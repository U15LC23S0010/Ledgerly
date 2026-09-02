import api from "./api";

export const getVendors = () => {
  return api.get("/vendors/");
};

// =========================================================
// CREATE VENDOR
// =========================================================

export const createVendor = (vendorData) => {
  return api.post("/vendors/", vendorData);
};

// =========================================================
// UPDATE VENDOR
// =========================================================

export const updateVendor = (id, vendorData) => {
  return api.put(`/vendors/${id}`, vendorData);
};

// =========================================================
// DELETE VENDOR
// =========================================================

export const deleteVendor = (id) => {
  return api.delete(`/vendors/${id}`);
};

// =========================================================
// BULK DELETE VENDORS
// =========================================================

export const bulkDeleteVendors = (vendorIds) => {
  return api.post("/vendors/bulk-delete", vendorIds);
};