import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { toast } from "sonner";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL?.trim() || (import.meta.env.DEV ? "http://localhost:4000" : "")
).replace(/\/$/, "");
const rawApiUrl = import.meta.env.VITE_API_URL?.trim() ?? "";
const isLocalhostUrl = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?/i.test(rawApiUrl);
const HAS_CONFIGURED_API_URL = (import.meta.env.DEV || !isLocalhostUrl) && rawApiUrl.length > 0;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers) => {
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("movix-auth-token");
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

function toastErrorIfNotAuth(error) {
  const status = error.status;
  if (status !== 401 && status !== 403) {
    const msg = error.data?.error || error.error || "Something went wrong";
    toast.error(msg);
  }
}

async function baseQuery(args, api, extraOptions) {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error) {
    toastErrorIfNotAuth(result.error);
  }
  return result;
}

const baseApi = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: [
    "Movies",
    "Movie",
    "Reviews",
    "Seats",
    "Bookings",
    "Admin",
    "Owner",
    "ComingSoon",
    "Theaters",
    "Shows",
  ],
  endpoints: () => ({}),
});

async function baseRequest(path, init = {}) {
  const result = await rawBaseQuery(
    {
      url: path,
      method: init.method ?? "GET",
      body: init.body
        ? typeof init.body === "string"
          ? JSON.parse(init.body)
          : init.body
        : undefined,
      ...(init.timeoutMs ? { timeout: init.timeoutMs } : {}),
    },
    { signal: init.signal },
    {},
  );
  if (result.error) {
    toastErrorIfNotAuth(result.error);
    const error = new Error(result.error.data?.error || result.error.error || "Request failed");
    error.response = { status: result.error.status, data: result.error.data };
    throw error;
  }
  return result.data;
}

function apiUrl(path) {
  if (!path) return API_BASE_URL;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export { API_BASE_URL, HAS_CONFIGURED_API_URL, apiUrl, baseApi, baseQuery, baseRequest };
