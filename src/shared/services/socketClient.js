import { API_BASE_URL } from "@/shared/services/httpClient";

function readAuthToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("movix-auth-token") || "";
}

async function createAppSocket() {
  if (typeof window === "undefined") return null;

  const { io } = await import("socket.io-client");
  const baseUrl = API_BASE_URL ? API_BASE_URL.replace(/\/$/, "") : undefined;
  return io(baseUrl, {
    auth: {
      token: readAuthToken(),
    },
    transports: ["websocket", "polling"],
  });
}

async function createBookingSocket() {
  return createAppSocket();
}

async function createNotificationSocket() {
  return createAppSocket();
}

export { createAppSocket, createBookingSocket, createNotificationSocket };
