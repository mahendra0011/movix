import { API_BASE_URL, HAS_CONFIGURED_API_URL } from "@/shared/services/httpClient";

async function createBookingSocket() {
  if (typeof window === "undefined") return null;
  const socketUrl = (import.meta.env.VITE_SOCKET_URL ?? "").trim();
  if (!socketUrl && !HAS_CONFIGURED_API_URL) return null;

  const { io } = await import("socket.io-client");
  return io((socketUrl || API_BASE_URL).replace(/\/$/, ""), {
    transports: ["websocket", "polling"],
  });
}

export { createBookingSocket };
