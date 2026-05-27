import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import {
  bindNotificationServer,
  getRecentNotifications,
  roleRoom,
  userRoom,
} from "../services/notificationHub.js";

function registerNotificationSockets(io) {
  bindNotificationServer(io);

  io.on("connection", (socket) => {
    const user = readSocketUser(socket);

    socket.join("notifications:public");
    if (user.email) socket.join(userRoom(user.email));
    if (user.role) socket.join(roleRoom(user.role));

    socket.emit("notifications:sync", getRecentNotifications(user));

    socket.on("notifications:refresh", (ack) => {
      ack?.({ ok: true, notifications: getRecentNotifications(user) });
    });
  });
}

function readSocketUser(socket) {
  const token =
    socket.handshake.auth?.token ||
    String(socket.handshake.headers.authorization || "").replace(/^Bearer\s+/i, "");

  if (!token) return {};

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return {};
  }
}

export { registerNotificationSockets };
