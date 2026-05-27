import { HAS_CONFIGURED_API_URL, requestJson } from "@/shared/services/httpClient";
import {
  mapOwnerApplicationForAdmin,
  readOwnerApplications,
  updateOwnerApplicationStatus,
} from "@/shared/services/ownerApplications";

async function fetchAdminSummary() {
  if (shouldUseLocalAdminFallback()) {
    return {
      summary: {
        revenue: 0,
        bookings: 0,
        seatsSold: 0,
        users: readOwnerApplications().length + 1,
        movies: 8,
        theaters: readOwnerApplications().filter((item) => item.status === "Approved").length,
        occupancy: 0,
        averageOrderValue: 0,
        averageSeatsPerBooking: 0,
        topMovie: "No bookings yet",
        database: "Static local",
        socket: "Static preview",
        seats: "Booked-seat sync",
        payment: "Test checkout",
      },
      charts: {
        revenueTrend: [],
        popularMovies: [],
        theaterPerformance: [],
      },
      recentBookings: [],
    };
  }

  const data = await requestJson("/api/admin/summary");
  return data;
}

async function fetchTheaterApplications() {
  if (shouldUseLocalAdminFallback()) {
    return { theaters: readOwnerApplications().map(mapOwnerApplicationForAdmin) };
  }

  return requestJson("/api/admin/theater-applications");
}

async function updateTheaterApplicationStatus(id, status) {
  if (shouldUseLocalAdminFallback()) {
    const updated = updateOwnerApplicationStatus(id, status);
    return { theater: updated ? mapOwnerApplicationForAdmin(updated) : null };
  }

  return requestJson(`/api/admin/theater-applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

function shouldUseLocalAdminFallback() {
  return !HAS_CONFIGURED_API_URL && !import.meta.env.DEV;
}

export { fetchAdminSummary, fetchTheaterApplications, updateTheaterApplicationStatus };
