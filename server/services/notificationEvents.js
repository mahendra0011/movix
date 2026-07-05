import { env } from "../config/env.js";
import { sendNotificationEmail } from "./emailService.js";
import { publishNotification } from "./notificationHub.js";
import { listSubscriberEmails, normalizeEmail } from "./subscriberStore.js";
import { logger } from "../services/logger.js";

const reminderTimers = new Map();

function clientHref(path = "/") {
  const origin = Array.isArray(env.clientOrigin) ? env.clientOrigin[0] : "";
  if (!origin || origin === true) return path;
  return `${origin.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

async function notifySubscriptionCreated(email) {
  await sendNotificationEmail({
    to: email,
    subject: "You are subscribed to movix alerts",
    eyebrow: "Launch alerts",
    title: "You are on the movie alerts list",
    message:
      "We will email you when new movies, trailers, premieres, and major cinema updates go live.",
    actionHref: clientHref("/"),
    actionLabel: "Explore movies",
    footer:
      "You subscribed from movix. New release and trailer emails are sent only for important catalog updates.",
  }).catch((error) => logger.warn("Subscriber welcome email failed: %s", error.message));
}

async function notifyMovieRelease(movie, options = {}) {
  const title = movie.title || movie.movie || "New movie";
  const theater = options.theaterName ? ` at ${options.theaterName}` : "";
  const trailerText = movie.trailerUrl || options.trailerUrl ? " Trailer is available too." : "";
  const href =
    movie.id || movie.movieId ? `/movies/${encodeURIComponent(movie.id || movie.movieId)}` : "/";
  const message = `${title}${theater} is now listed on movix.${trailerText}`;

  publishNotification({
    audience: "public",
    type: "movie-release",
    title: "New movie release",
    message,
    href,
  });

  publishNotification({
    audience: "role",
    role: "admin",
    type: "movie-release",
    title: "Catalog notification sent",
    message,
    href: "/admin",
  });

  const emails = await listSubscriberEmails();
  await Promise.allSettled(
    emails.map((email) =>
      sendNotificationEmail({
        to: email,
        subject: `${title} is now listed on movix`,
        eyebrow: "New release",
        title: `${title} is live`,
        message,
        actionHref: clientHref(href),
        actionLabel: movie.trailerUrl || options.trailerUrl ? "Watch trailer" : "View movie",
        footer:
          "You are receiving this because you subscribed to movix launch alerts from the home page.",
      }),
    ),
  );
}

function notifyBookingCreated(booking) {
  const seatText = booking.seats?.join(", ") || "selected seats";
  const confirmationHref = `/confirmation?ref=${encodeURIComponent(booking.ref)}`;

  publishNotification({
    audience: "user",
    email: booking.email,
    type: "booking",
    title: "Ticket confirmed",
    message: `${booking.movie} at ${booking.theater} - ${seatText}`,
    href: confirmationHref,
  });

  publishNotification({
    audience: "user",
    email: booking.email,
    type: "ticket",
    title: "E-ticket delivered",
    message: `Your e-ticket and invoice for ${booking.movie} are ready.`,
    href: confirmationHref,
  });

  publishNotification({
    audience: "role",
    role: "admin",
    type: "booking",
    title: "New booking received",
    message: `${booking.movie} - ${seatText} - Rs ${booking.total}`,
    href: "/admin",
  });

  publishNotification({
    audience: "role",
    role: "theater-owner",
    type: "booking",
    title: "New cinema booking",
    message: `${booking.theater}: ${booking.movie} - ${seatText}`,
    href: "/owner",
  });

  scheduleBookingReminders(booking);
}

function notifyBookingStatusChange(booking, event = {}) {
  const type = event.type || "booking-update";
  const title = event.title || "Booking updated";
  const message =
    event.message ||
    `${booking.movie} at ${booking.theater} has an update: ${event.reason || "status changed"}.`;
  const href = `/confirmation?ref=${encodeURIComponent(booking.ref)}`;

  publishNotification({
    audience: "user",
    email: booking.email,
    type,
    title,
    message,
    href,
  });

  if (event.email !== false) {
    sendNotificationEmail({
      to: booking.email,
      subject: title,
      eyebrow: "Booking update",
      title,
      message,
      actionHref: clientHref(href),
      actionLabel: "View ticket",
    }).catch((error) => logger.warn("Booking update email failed: %s", error.message));
  }

  publishNotification({
    audience: "role",
    role: "admin",
    type,
    title,
    message: `${booking.ref}: ${message}`,
    href: "/admin",
  });

  publishNotification({
    audience: "role",
    role: "theater-owner",
    type,
    title,
    message: `${booking.theater}: ${message}`,
    href: "/owner",
  });
}

async function notifyOwnerShowChanges({
  theater,
  previousShows = [],
  nextShows = [],
  bookings = [],
}) {
  const previousById = new Map(previousShows.map((show) => [show.id, show]));
  const bookingsByShow = groupBookingsByShow(bookings);
  const notifiedMovieIds = new Set();

  for (const show of nextShows) {
    const previous = previousById.get(show.id);
    const isPublic = isPublicShow(show);

    if (!previous && isPublic && !notifiedMovieIds.has(show.movieId)) {
      notifiedMovieIds.add(show.movieId);
      await notifyMovieRelease(show, {
        theaterName: theater.name,
        trailerUrl: show.trailerUrl,
      });
      publishNotification({
        audience: "role",
        role: "theater-owner",
        type: "movie-release",
        title: "New show listed",
        message: `${show.movie} is now listed at ${theater.name}.`,
        href: "/owner",
      });
      continue;
    }

    if (!previous) continue;

    const showBookings = bookingsByShow.get(show.id) || [];
    if (!showBookings.length) continue;

    if (isCancelledShow(show) && !isCancelledShow(previous)) {
      for (const booking of showBookings) {
        notifyBookingStatusChange(booking, {
          type: "cancellation",
          title: "Show cancelled",
          message: `${booking.movie} at ${booking.theater} was cancelled. Refund update will follow.`,
        });
        notifyBookingStatusChange(booking, {
          type: "refund",
          title: "Refund update",
          message: `Refund processing started for ${booking.ref}.`,
          email: false,
        });
      }
      continue;
    }

    if (isRescheduledShow(previous, show)) {
      for (const booking of showBookings) {
        notifyBookingStatusChange(
          {
            ...booking,
            time: show.time || show.startTime || booking.time,
          },
          {
            type: "reschedule",
            title: "Show rescheduled",
            message: `${booking.movie} has a new timing: ${show.date ? `${show.date} ` : ""}${
              show.time || show.startTime
            }.`,
          },
        );
      }
    }
  }
}

function scheduleBookingReminders(booking) {
  const showDate = parseShowDateTime(booking.time);
  if (!showDate) return;

  for (const hoursBefore of [2, 1]) {
    const remindAt = showDate.getTime() - hoursBefore * 60 * 60 * 1000;
    const delay = remindAt - Date.now();
    if (delay <= 0 || delay > 7 * 24 * 60 * 60 * 1000) continue;

    const timerKey = `${booking.ref}:${hoursBefore}`;
    if (reminderTimers.has(timerKey)) clearTimeout(reminderTimers.get(timerKey));

    const timer = setTimeout(() => {
      publishNotification({
        audience: "user",
        email: booking.email,
        type: "show-reminder",
        title: `${hoursBefore} hour show reminder`,
        message: `${booking.movie} starts at ${booking.time}. Seats: ${
          booking.seats?.join(", ") || "selected seats"
        }.`,
        href: `/confirmation?ref=${encodeURIComponent(booking.ref)}`,
      });
      reminderTimers.delete(timerKey);
    }, delay);

    reminderTimers.set(timerKey, timer);
  }
}

function parseShowDateTime(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  const lower = text.toLowerCase();
  const timeMatches = [...text.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi)];
  const timeMatch =
    timeMatches.findLast((match) => match[3] || match[2]) || timeMatches[timeMatches.length - 1];
  if (!timeMatch) return null;

  const date = new Date();
  date.setSeconds(0, 0);
  if (lower.includes("tomorrow")) date.setDate(date.getDate() + 1);
  const dayMonthMatch = text.match(/\b(\d{1,2})\s+([a-z]{3})\b/i);
  if (dayMonthMatch && !lower.includes("today") && !lower.includes("tomorrow")) {
    const monthIndex = monthNameToIndex(dayMonthMatch[2]);
    if (monthIndex >= 0) {
      date.setMonth(monthIndex, Number(dayMonthMatch[1]));
      if (date.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
        date.setFullYear(date.getFullYear() + 1);
      }
    }
  }

  let hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2] || 0);
  const meridiem = timeMatch[3]?.toLowerCase();
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  date.setHours(hours, minutes, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthNameToIndex(value) {
  return [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ].indexOf(String(value || "").toLowerCase());
}

function groupBookingsByShow(bookings) {
  return bookings.reduce((map, booking) => {
    if (!booking.showId) return map;
    const current = map.get(booking.showId) || [];
    current.push({
      ...booking,
      email: normalizeEmail(booking.email),
      total: Number(booking.total || booking.totalAmount || 0),
    });
    map.set(booking.showId, current);
    return map;
  }, new Map());
}

function isPublicShow(show) {
  const status = String(show.status || "").toLowerCase();
  return show.listingType !== "coming-soon" && status !== "draft" && status !== "coming soon";
}

function isCancelledShow(show) {
  const status = String(show.status || "").toLowerCase();
  return status.includes("cancel");
}

function isRescheduledShow(previous, next) {
  return ["date", "time", "startTime", "endTime", "screen"].some(
    (key) => String(previous[key] || "") !== String(next[key] || ""),
  );
}

export {
  notifyBookingCreated,
  notifyBookingStatusChange,
  notifyMovieRelease,
  notifyOwnerShowChanges,
  notifySubscriptionCreated,
};
