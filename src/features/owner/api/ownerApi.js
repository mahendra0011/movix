import { HAS_CONFIGURED_API_URL, requestJson } from "@/shared/services/httpClient";

async function fetchOwnerWorkspace() {
  if (!HAS_CONFIGURED_API_URL) {
    throwLocalOwnerError("Owner workspace requires the API.");
  }

  const data = await requestJson("/api/owner/workspace");
  return data.workspace;
}

async function saveOwnerWorkspace(workspace) {
  if (!HAS_CONFIGURED_API_URL) {
    throwLocalOwnerError("Owner workspace requires the API.");
  }

  const data = await requestJson("/api/owner/workspace", {
    method: "PUT",
    body: JSON.stringify(workspace),
  });
  return data.workspace;
}

function throwLocalOwnerError(message) {
  const error = new Error(message);
  error.response = { status: 503, data: { error: message } };
  throw error;
}

export { fetchOwnerWorkspace, saveOwnerWorkspace };
