import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { env } from "./config/env.js";
import { adminRoutes } from "./routes/adminRoutes.js";
import { authRoutes } from "./routes/authRoutes.js";
import { createBookingRoutes } from "./routes/bookingRoutes.js";
import { movieRoutes } from "./routes/movieRoutes.js";
import { notificationRoutes } from "./routes/notificationRoutes.js";
import { ownerRoutes } from "./routes/ownerRoutes.js";
import { paymentRoutes } from "./routes/paymentRoutes.js";
import { showRoutes } from "./routes/showRoutes.js";
import { theaterRoutes } from "./routes/theaterRoutes.js";
import { uploadRoutes } from "./routes/uploadRoutes.js";
import { connectDatabase, isMongoReady } from "./services/database.js";
import { createSeatHoldStore } from "./services/seatHoldService.js";
import { createRateLimiter } from "./middleware/rateLimit.js";
import { requestContext } from "./middleware/requestContext.js";
import { securityHeaders } from "./middleware/securityHeaders.js";
import { registerNotificationSockets } from "./sockets/notificationSocket.js";
import { registerSeatSockets } from "./sockets/seatSocket.js";

const corsOptions = {
  origin: env.clientOrigin,
  credentials: true,
};
const apiRateLimiter = createRateLimiter({
  keyPrefix: "api",
  limit: 900,
  windowMs: 15 * 60 * 1000,
});
const authRateLimiter = createRateLimiter({
  keyPrefix: "auth",
  limit: 40,
  windowMs: 10 * 60 * 1000,
  message: "Too many auth attempts. Please wait before trying again.",
});
const paymentRateLimiter = createRateLimiter({
  keyPrefix: "payments",
  limit: 80,
  windowMs: 10 * 60 * 1000,
});
const uploadRateLimiter = createRateLimiter({
  keyPrefix: "uploads",
  limit: 30,
  windowMs: 10 * 60 * 1000,
});

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: corsOptions,
});

app.use(requestContext);
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(express.json({ limit: "12mb" }));

await connectDatabase();

const seatHolds = createSeatHoldStore();
const { router: bookingRoutes, getBookedSeats } = createBookingRoutes({ io, seatHolds });
registerSeatSockets(io, { getBookedSeats, seatHolds });
registerNotificationSockets(io);

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    service: "movix API",
    database: isMongoReady() ? "MongoDB connected" : "Local memory store",
    socket: "enabled",
    seats: "Booked and held-seat sync",
    notifications: "Live notifications enabled",
    email:
      env.brevoApiKey && env.brevoFromEmail ? "Brevo configured" : "Email provider not configured",
    payment:
      env.paymentProvider === "razorpay" && env.razorpayKeyId && env.razorpayKeySecret
        ? "Razorpay connected"
        : "Local test checkout",
    uploads: env.cloudinaryUrl || env.cloudinaryCloudName ? "Cloudinary configured" : "Disabled",
  });
});

app.use("/api", apiRateLimiter);
app.use("/api/auth", authRateLimiter);
app.use("/api/payments", paymentRateLimiter);
app.use("/api/uploads", uploadRateLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/theaters", theaterRoutes);
app.use("/api/shows", showRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api", bookingRoutes);

app.use("/api", (request, response) => {
  response.status(404).json({ error: "API route not found.", requestId: request.id });
});

app.use((error, request, response, _next) => {
  console.error(error);

  const status = Number(error.status ?? error.statusCode ?? 500);
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  const message =
    safeStatus < 500 ? error.message || "Request failed." : "Something went wrong in the API.";

  response.status(safeStatus).json({
    error: message,
    requestId: request.id,
  });
});

httpServer.listen(env.apiPort, () => {
  console.log(`movix API + Socket.IO running on http://localhost:${env.apiPort}`);
});

function shutdown(signal) {
  console.log(`${signal} received. Closing movix API server.`);
  httpServer.close(() => {
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
