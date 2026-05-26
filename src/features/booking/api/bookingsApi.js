import { requestJson } from "@/shared/services/httpClient";

function localBooking(input) {
  return {
    ...input,
    ref: `BMS${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    status: "held",
  };
}

async function createBooking(input) {
  try {
    const data = await requestJson("/api/bookings", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return data.booking;
  } catch {
    return localBooking(input);
  }
}

export { createBooking };
