import axios from "axios";

/*
=========================================================
API CONFIGURATION
=========================================================
*/

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1";

console.log("API BASE URL:", API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,

  headers: {
    "Content-Type": "application/json",
  },

  timeout: 30000,
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
      config.headers = config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    console.log(
      "API REQUEST:",
      config.method?.toUpperCase(),
      `${config.baseURL}${config.url}`
    );

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);


/*
=========================================================
RESPONSE INTERCEPTOR
=========================================================
*/

api.interceptors.response.use(
  (response) => {

    console.log(
      "API RESPONSE:",
      response.status,
      response.config?.url
    );

    return response;
  },

  (error) => {

    console.error(
      "API ERROR:",
      error.config?.method?.toUpperCase(),
      error.config?.url,
      error.response?.status,
      error.response?.data
    );

    const status = error.response?.status;

    /*
    =====================================================
    JWT AUTHENTICATION
    =====================================================
    */

    if (status === 401) {

      console.warn(
        "JWT authentication failed or expired."
      );

      const hadAuthorizationHeader =
        !!error.config?.headers?.Authorization;

      /*
      Only clear authentication data when
      the failed request actually used a JWT.
      */

      if (hadAuthorizationHeader) {

        localStorage.removeItem("access");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("userEmail");
      }
    }

    return Promise.reject(error);
  }
);

export default api;