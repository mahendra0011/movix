import { baseRequest, HAS_CONFIGURED_API_URL } from "@/features/api/baseApi";

async function fetchOwnerWorkspace() {
  if (!HAS_CONFIGURED_API_URL) {
    throwLocalOwnerError("Owner workspace requires the API.");
  }

  const data = await baseRequest("/api/owner/workspace");
  return data.workspace;
}

async function saveOwnerWorkspace(workspace) {
  if (!HAS_CONFIGURED_API_URL) {
    throwLocalOwnerError("Owner workspace requires the API.");
  }

  const data = await baseRequest("/api/owner/workspace", {
    method: "PUT",
    body: workspace,
  });
  return data.workspace;
}

async function verifyTicketByQr(qrData) {
  if (!HAS_CONFIGURED_API_URL) {
    throwLocalOwnerError("Ticket verification requires the API.");
  }

  const data = await baseRequest("/api/owner/verify-ticket", {
    method: "POST",
    body: { qrData },
  });
  return data;
}

async function fetchScanStats() {
  if (!HAS_CONFIGURED_API_URL) {
    throwLocalOwnerError("Scan stats require the API.");
  }

  const data = await baseRequest("/api/owner/scan-stats");
  return data.stats;
}

function throwLocalOwnerError(message) {
  const error = new Error(message);
  error.response = { status: 503, data: { error: message } };
  throw error;
}

export { fetchOwnerWorkspace, fetchScanStats, saveOwnerWorkspace, verifyTicketByQr };
