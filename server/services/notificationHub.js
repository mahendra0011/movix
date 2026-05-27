import crypto from "node:crypto";

const recentNotifications = [];
const MAX_RECENT_NOTIFICATIONS = 40;
let ioServer = null;

function bindNotificationServer(io) {
  ioServer = io;
}

function createNotification(input) {
  return {
    id: input.id || `notif-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`,
    type: input.type || "info",
    title: String(input.title || "Notification"),
    message: String(input.message || ""),
    href: input.href || "",
    audience: input.audience || "public",
    email: normalizeEmail(input.email),
    role: input.role || "",
    createdAt: new Date().toISOString(),
  };
}

function getRecentNotifications(user = {}) {
  return recentNotifications.filter((notification) => canReceiveNotification(notification, user));
}

function publishNotification(input) {
  const notification = createNotification(input);
  recentNotifications.unshift(notification);
  recentNotifications.splice(MAX_RECENT_NOTIFICATIONS);

  if (!ioServer) return notification;

  if (notification.audience === "user" && notification.email) {
    ioServer.to(userRoom(notification.email)).emit("notification", notification);
    return notification;
  }

  if (notification.audience === "role" && notification.role) {
    ioServer.to(roleRoom(notification.role)).emit("notification", notification);
    return notification;
  }

  ioServer.to("notifications:public").emit("notification", notification);
  return notification;
}

function canReceiveNotification(notification, user = {}) {
  if (notification.audience === "public") return true;
  if (notification.audience === "role") return notification.role && user.role === notification.role;
  if (notification.audience === "user") {
    return notification.email && normalizeEmail(user.email) === notification.email;
  }
  return false;
}

function normalizeEmail(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function roleRoom(role) {
  return `notifications:role:${role}`;
}

function userRoom(email) {
  return `notifications:user:${normalizeEmail(email)}`;
}

export { bindNotificationServer, getRecentNotifications, publishNotification, roleRoom, userRoom };
