import { requestJson } from "@/shared/services/httpClient";

async function fetchAdminSummary() {
  const data = await requestJson("/api/admin/summary");
  return data;
}

export { fetchAdminSummary };
