import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});


api.interceptors.request.use(
  (config) => {
    const accessToken =
      localStorage.getItem("access_token") ||
      localStorage.getItem("access") ||
      localStorage.getItem("token");

    if (accessToken) {
      config.headers = config.headers || {};

      config.headers.Authorization =
        `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    const status =
      error.response?.status;

    if (status === 401) {
      console.warn(
        "Ledgerly session expired."
      );

      localStorage.removeItem(
        "access_token"
      );

      localStorage.removeItem(
        "access"
      );

      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "refresh"
      );

      localStorage.removeItem(
        "refresh_token"
      );

      localStorage.removeItem(
        "user"
      );

      localStorage.removeItem(
        "userEmail"
      );

      const currentPath =
        window.location.pathname;

      const isAuthPage =
        currentPath === "/login" ||
        currentPath === "/register" ||
        currentPath === "/forgot-password" ||
        currentPath === "/reset-password";

      if (!isAuthPage) {
        window.location.replace(
          "/login"
        );
      }
    }

    return Promise.reject(error);
  }
);

export default api;