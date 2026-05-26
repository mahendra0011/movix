import { API_BASE_URL } from "@/shared/services/httpClient";

async function createBookingSocket(ownerId) {
  if (typeof window === "undefined") return null;

  const { io } = await import("socket.io-client");
  return io((import.meta.env.VITE_SOCKET_URL ?? API_BASE_URL).replace(/\/$/, ""), {
    auth: { ownerId },
    transports: ["websocket", "polling"],
  });
}

export { createBookingSocket };
