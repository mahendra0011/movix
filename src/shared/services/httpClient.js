import axios from "axios";

const rawConfiguredApiUrl = import.meta.env.VITE_API_URL?.trim() ?? "";
const isLocalhostApiUrl = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?/i.test(
  rawConfiguredApiUrl,
);
const configuredApiUrl = !import.meta.env.DEV && isLocalhostApiUrl ? "" : rawConfiguredApiUrl;
const HAS_CONFIGURED_API_URL = configuredApiUrl.length > 0;
const API_BASE_URL = (
  configuredApiUrl || (import.meta.env.DEV ? "http://localhost:4000" : "")
).replace(/\/$/, "");
const DEFAULT_API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 3000;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_API_TIMEOUT_MS,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("movix-auth-token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

async function requestJson(path, init) {
  const response = await apiClient.request({
    url: path,
    method: init?.method ?? "GET",
    headers: init?.headers,
    timeout: init?.timeoutMs,
    data: init?.body ? JSON.parse(init.body) : undefined,
  });

  return response.data;
}

function apiUrl(path) {
  if (!path) return API_BASE_URL;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export { API_BASE_URL, HAS_CONFIGURED_API_URL, apiClient, apiUrl, requestJson };
