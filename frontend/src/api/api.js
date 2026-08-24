import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,

  headers: {
    "Content-Type": "application/json",
  },
});


/*
=========================================================
REQUEST INTERCEPTOR
=========================================================
*/

api.interceptors.request.use(
  (config) => {

    const token =
      localStorage.getItem("access") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token");

    if (token) {

      config.headers =
        config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;
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

IMPORTANT:
Do NOT redirect to /login here.

ProtectedRoute is responsible for authentication
routing.

=========================================================
*/

api.interceptors.response.use(

  (response) => {
    return response;
  },

  (error) => {

    const status =
      error.response?.status;

    if (status === 401) {

      console.warn(
        "JWT authentication failed or expired."
      );

      localStorage.removeItem(
        "access"
      );

      localStorage.removeItem(
        "access_token"
      );

      localStorage.removeItem(
        "refresh"
      );

      localStorage.removeItem(
        "refresh_token"
      );

      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "user"
      );

      localStorage.removeItem(
        "userEmail"
      );
    }

    return Promise.reject(error);
  }
);


export default api;