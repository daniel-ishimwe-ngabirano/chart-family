import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "";

const axiosInstance = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  const csrfToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrf-token="))
    ?.split("=")[1];
  if (csrfToken && !["get", "head", "options"].includes(config.method?.toLowerCase() || "")) {
    config.headers["x-csrf-token"] = csrfToken;
  }
  return config;
});

export default axiosInstance;
