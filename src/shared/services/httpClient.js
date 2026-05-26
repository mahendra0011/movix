import axios from "axios";

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("bms-auth-token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

async function requestJson(path, init) {
  const response = await apiClient.request({
    url: path,
    method: init?.method ?? "GET",
    headers: init?.headers,
    data: init?.body ? JSON.parse(init.body) : undefined,
  });

  return response.data;
}

function apiUrl(path) {
  if (!path) return API_BASE_URL;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export { API_BASE_URL, apiClient, apiUrl, requestJson };
