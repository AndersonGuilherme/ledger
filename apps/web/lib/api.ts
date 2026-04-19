import axios, { AxiosError } from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Prevent multiple simultaneous 401 redirects from cascading queries
let isRedirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      !isRedirecting &&
      !window.location.pathname.startsWith("/login")
    ) {
      isRedirecting = true;
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
