import api from "./api";

/*
=========================================================
GET TRANSACTIONS
=========================================================
*/

export const getTransactions = (params = {}) => {
  return api.get("/transactions/", {
    params,
  });
};

/*
=========================================================
CREATE TRANSACTION
=========================================================
*/

export const createTransaction = (transactionData) => {
  return api.post(
    "/transactions/",
    transactionData
  );
};

/*
=========================================================
UPDATE TRANSACTION
=========================================================
*/

export const updateTransaction = (
  id,
  transactionData
) => {
  return api.put(
    `/transactions/${id}`,
    transactionData
  );
};

/*
=========================================================
DELETE TRANSACTION
=========================================================
*/

export const deleteTransaction = (id) => {
  return api.delete(
    `/transactions/${id}`
  );
};

/*
=========================================================
BULK DELETE TRANSACTIONS
=========================================================
*/

export const bulkDeleteTransactions = (
  transactionIds
) => {
  return api.delete(
    "/transactions/bulk",
    {
      data: {
        transaction_ids: transactionIds,
      },
    }
  );
};