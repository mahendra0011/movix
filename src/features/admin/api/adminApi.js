import { HAS_CONFIGURED_API_URL, requestJson } from "@/shared/services/httpClient";
import {
  mapOwnerApplicationForAdmin,
  deleteOwnerApplication,
  readOwnerApplications,
  updateOwnerApplicationStatus,
} from "@/shared/services/ownerApplications";

const LOCAL_BOOKINGS_KEY = "movix-local-bookings";
const LOCAL_USERS_KEY = "movix-local-auth-users";

async function fetchAdminSummary() {
  if (shouldUseLocalAdminFallback()) {
    const bookings = readLocalBookings();
    const ownerApplications = readOwnerApplications();
    const revenue = bookings.reduce((sum, booking) => sum + Number(booking.total || 0), 0);
    const seatsSold = bookings.reduce(
      (sum, booking) => sum + (Array.isArray(booking.seats) ? booking.seats.length : 0),
      0,
    );

    return {
      summary: {
        revenue,
        bookings: bookings.length,
        seatsSold,
        users: readLocalUsersCount(),
        movies: 8,
        theaters: ownerApplications.filter((item) => item.status === "Approved").length,
        occupancy: bookings.length ? Math.min(100, Math.round((seatsSold / 120) * 100)) : 0,
        averageOrderValue: bookings.length ? Math.round(revenue / bookings.length) : 0,
        averageSeatsPerBooking: bookings.length
          ? Number((seatsSold / bookings.length).toFixed(1))
          : 0,
        topMovie: getTopMovie(bookings),
        database: "Static local",
        socket: "Static preview",
        seats: "Booked-seat sync",
        payment: "Test checkout",
      },
      charts: {
        revenueTrend: buildRevenueTrend(bookings),
        popularMovies: buildPopularMovies(bookings),
        theaterPerformance: [],
      },
      recentBookings: bookings,
    };
  }

  const data = await requestJson("/api/admin/summary");
  return data;
}

async function fetchTheaterApplications() {
  if (shouldUseLocalAdminFallback()) {
    return {
      theaters: readOwnerApplications()
        .filter((application) => application.status !== "Rejected")
        .map(mapOwnerApplicationForAdmin),
    };
  }

  return requestJson("/api/admin/theater-applications");
}

async function fetchAdminTheaters() {
  if (shouldUseLocalAdminFallback()) return { theaters: [] };
  return requestJson("/api/theaters");
}

async function fetchAdminUsers() {
  if (shouldUseLocalAdminFallback()) return { users: readLocalUsers() };
  return requestJson("/api/admin/users");
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

async function deleteTheaterApplication(id) {
  if (shouldUseLocalAdminFallback()) {
    return { theater: deleteOwnerApplication(id) };
  }

  return requestJson(`/api/admin/theater-applications/${id}`, {
    method: "DELETE",
  });
}

async function deleteAdminTheater(id) {
  if (shouldUseLocalAdminFallback()) return { theater: null };

  return requestJson(`/api/admin/theaters/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

async function updateAdminUser(id, input) {
  if (shouldUseLocalAdminFallback()) {
    const users = readLocalUsers();
    const nextUsers = users.map((user) =>
      String(user.id || user.email) === String(id)
        ? { ...user, ...input, status: input.blocked ? "Blocked" : "Active" }
        : user,
    );
    writeJson(LOCAL_USERS_KEY, nextUsers);
    return { user: nextUsers.find((user) => String(user.id || user.email) === String(id)) };
  }

  return requestJson(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

async function deleteAdminUser(id) {
  if (shouldUseLocalAdminFallback()) {
    const users = readLocalUsers();
    const nextUsers = users.filter((user) => String(user.id || user.email) !== String(id));
    writeJson(LOCAL_USERS_KEY, nextUsers);
    return { ok: true };
  }

  return requestJson(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

function shouldUseLocalAdminFallback() {
  return !HAS_CONFIGURED_API_URL;
}

function readLocalBookings() {
  return readJson(LOCAL_BOOKINGS_KEY, []).map((booking) => ({
    ...booking,
    total: Number(booking.total || booking.amount || 0),
    seats: Array.isArray(booking.seats) ? booking.seats : [],
  }));
}

function readLocalUsersCount() {
  return readJson(LOCAL_USERS_KEY, []).length + 1;
}

function readLocalUsers() {
  return [
    {
      id: "local-admin",
      name: "Mahendra Admin",
      email: "mahendrapra0077@gmail.com",
      role: "admin",
      verified: true,
      status: "Active",
    },
    ...readJson(LOCAL_USERS_KEY, []),
  ].map((user) => ({
    ...user,
    id: user.id || user.email,
    status: user.blocked ? "Blocked" : user.status || "Active",
  }));
}

function buildRevenueTrend(bookings) {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const dayBookings = bookings.filter((booking) =>
      String(booking.bookedAt || "").startsWith(key),
    );
    return {
      day: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      revenue: dayBookings.reduce((sum, booking) => sum + Number(booking.total || 0), 0),
      bookings: dayBookings.length,
      seats: dayBookings.reduce((sum, booking) => sum + booking.seats.length, 0),
    };
  });
}

function buildPopularMovies(bookings) {
  const totals = bookings.reduce((acc, booking) => {
    const movie = booking.movie || "Movie";
    acc[movie] = (acc[movie] || 0) + Number(booking.total || 0);
    return acc;
  }, {});

  return Object.entries(totals)
    .map(([movie, value]) => ({ movie, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);
}

function getTopMovie(bookings) {
  return buildPopularMovies(bookings)[0]?.movie || "No bookings yet";
}

function readJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export {
  deleteAdminUser,
  deleteAdminTheater,
  deleteTheaterApplication,
  fetchAdminTheaters,
  fetchAdminSummary,
  fetchAdminUsers,
  fetchTheaterApplications,
  updateAdminUser,
  updateTheaterApplicationStatus,
};
