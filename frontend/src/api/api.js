import axios from "axios";

/*
=========================================================
AXIOS API INSTANCE
=========================================================
*/

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/*
=========================================================
REQUEST INTERCEPTOR
Attach JWT token to every authenticated request
=========================================================
*/

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("access");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/*
=========================================================
RESPONSE INTERCEPTOR
Handle expired / invalid JWT
=========================================================
*/

api.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      console.warn(
        "JWT authentication failed or expired."
      );

      // Remove authentication data
      localStorage.removeItem("access_token");
      localStorage.removeItem("access");
      localStorage.removeItem("token");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("user");

      // Redirect to login
      if (
        window.location.pathname !== "/login" &&
        window.location.pathname !== "/register"
      ) {
        window.location.replace("/login");
      }
    }

    return Promise.reject(error);
  }
);

export default api;