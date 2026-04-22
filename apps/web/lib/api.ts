import axios, { AxiosError } from "axios";
import { getAuthToken, clearAuthToken } from "./cookies";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
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
      clearAuthToken();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
