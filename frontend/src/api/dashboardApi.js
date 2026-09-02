import api from "./api";

export const getDashboard = (month) => {
  return api.get(
    "/dashboard/",
    {
      params: {
        month,
      },
    }
  );
};