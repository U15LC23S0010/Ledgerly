import api from "./api";


export const getExpenses = (params = {}) => {
  return api.get("/expenses/", {
    params,
  });
};


export const searchExpenses = (
  keyword,
  params = {}
) => {
  return api.get("/expenses/search", {
    params: {
      keyword,
      ...params,
    },
  });
};

/*
=========================================================
FILTER EXPENSES
=========================================================
*/

export const filterExpenses = (params = {}) => {
  return api.get("/expenses/filter", {
    params,
  });
};

/*
=========================================================
CREATE EXPENSE
=========================================================
*/

export const createExpense = (expenseData) => {
  return api.post(
    "/expenses/",
    expenseData
  );
};

/*
=========================================================
UPDATE EXPENSE
=========================================================
*/

export const updateExpense = (
  id,
  expenseData
) => {
  return api.put(
    `/expenses/${id}`,
    expenseData
  );
};

/*
=========================================================
DELETE EXPENSE
=========================================================
*/

export const deleteExpense = (id) => {
  return api.delete(
    `/expenses/${id}`
  );
};

/*
=========================================================
EXPORT EXPENSES CSV
=========================================================
*/

export const exportExpensesCSV = () => {
  return api.get(
    "/expenses/export/csv",
    {
      responseType: "blob",
    }
  );
};