import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "";

const axiosInstance = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true,
  timeout: 15000,
});

let csrfTokenPromise = null;

function readCsrfCookie() {
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
  return match ? match[1] : null;
}

async function getCsrfToken() {
  if (!csrfTokenPromise) {
    csrfTokenPromise = (async () => {
      let token = readCsrfCookie();
      if (token) return token;
      try {
        await axiosInstance.get("/health");
        return readCsrfCookie();
      } catch {
        return null;
      }
    })();
    setTimeout(() => { csrfTokenPromise = null; }, 5 * 60 * 1000);
  }
  return csrfTokenPromise;
}

axiosInstance.interceptors.request.use(async (config) => {
  if (["get", "head", "options"].includes(config.method?.toLowerCase() || "")) {
    return config;
  }
  try {
    const token = await getCsrfToken();
    if (token) {
      config.headers["x-csrf-token"] = token;
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
