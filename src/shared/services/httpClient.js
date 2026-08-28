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
const MAX_RETRIES = 2;
const RETRYABLE_STATUSES = [408, 429, 500, 502, 503, 504];

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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ERR_CANCELED" || axios.isCancel(error)) {
      return Promise.reject(error);
    }
    if (error.response) {
      const status = error.response.status;
      if (status === 401 || status === 403) {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("movix-auth-token");
          window.dispatchEvent(new CustomEvent("movix:auth-expired"));
        }
      }
    } else if (error.code === "ECONNABORTED") {
      error.message = "Request timed out. Please check your connection.";
    } else if (!error.response) {
      error.message = "Network error. Please check your connection.";
    }
    return Promise.reject(error);
  },
);

function isRetryable(error) {
  if (!error.response) return false;
  return RETRYABLE_STATUSES.includes(error.response.status);
}

async function requestJson(path, init) {
  const retries = init?.retries ?? MAX_RETRIES;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await apiClient.request({
        url: path,
        method: init?.method ?? "GET",
        headers: init?.headers,
        timeout: init?.timeoutMs,
        data: init?.body ? JSON.parse(init.body) : undefined,
        signal: init?.signal,
      });
      return response.data;
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt >= retries || error.code === "ERR_CANCELED" || axios.isCancel(error)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 500));
    }
  }

  throw lastError;
}

async function uploadFile(path, file, { onProgress, fieldName = "file", timeoutMs = 30000, signal } = {}) {
  const formData = new FormData();
  formData.append(fieldName, file);

  const response = await apiClient.post(path, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: timeoutMs,
    signal,
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        onProgress({ loaded: progressEvent.loaded, total: progressEvent.total });
      }
    },
  });

  return response.data;
}

function cancelRequest(source) {
  if (source && typeof source.cancel === "function") {
    source.cancel("Request cancelled by user.");
  }
}

function makeCancelSource() {
  return axios.CancelToken.source();
}

function apiUrl(path) {
  if (!path) return API_BASE_URL;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export {
  API_BASE_URL,
  HAS_CONFIGURED_API_URL,
  apiClient,
  apiUrl,
  cancelRequest,
  makeCancelSource,
  requestJson,
  uploadFile,
};
