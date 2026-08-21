import api from "./api";

// =========================================================
// GET CATEGORIES
// =========================================================

export const getCategories = () => {
  return api.get("/categories/");
};

// =========================================================
// CREATE CATEGORY
// =========================================================

export const createCategory = (categoryData) => {
  return api.post(
    "/categories/",
    categoryData
  );
};

// =========================================================
// UPDATE CATEGORY
// =========================================================

export const updateCategory = (
  id,
  categoryData
) => {
  return api.put(
    `/categories/${id}`,
    categoryData
  );
};

// =========================================================
// DELETE CATEGORY
// =========================================================

export const deleteCategory = (id) => {
  return api.delete(
    `/categories/${id}`
  );
};