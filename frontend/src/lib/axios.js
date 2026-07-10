import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "";

const axiosInstance = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true,
  timeout: 30000,
});

let csrfTokenPromise = null;

async function getCsrfToken() {
  if (!csrfTokenPromise) {
    csrfTokenPromise = axiosInstance.get("/csrf-token").then(res => res.data.csrfToken).catch(() => null);
    setTimeout(() => { csrfTokenPromise = null; }, 5 * 60 * 1000);
  }
  return csrfTokenPromise;
}

axiosInstance.interceptors.request.use(async (config) => {
  if (["get", "head", "options"].includes(config.method?.toLowerCase() || "")) {
    return config;
  }
  try {
    const token = localStorage.getItem("wavechat_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    const csrfToken = await getCsrfToken();
    if (csrfToken) {
      config.headers["x-csrf-token"] = csrfToken;
    }
  } catch {}
  return config;
});

axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 403 && err.response?.data?.error === "Invalid CSRF token") {
      csrfTokenPromise = null;
    }
    return Promise.reject(err);
  },
);

export default axiosInstance;
