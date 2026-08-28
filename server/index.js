import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import morgan from "morgan";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { env } from "./config/env.js";
import { logger } from "./services/logger.js";
import { jobQueue } from "./services/jobQueue.js";
import { logAudit } from "./services/auditService.js";
import {
  sendBookingEmail,
  sendNotificationEmail,
  sendOtpEmail,
  getEmailProviderStatus,
} from "./services/emailService.js";
import { adminRoutes } from "./routes/adminRoutes.js";
import { authRoutes } from "./routes/authRoutes.js";
import { googleAuthRoutes } from "./routes/googleAuth.js";
import { createBookingRoutes } from "./routes/bookingRoutes.js";
import { movieRoutes } from "./routes/movieRoutes.js";
import { notificationRoutes } from "./routes/notificationRoutes.js";
import { ownerRoutes } from "./routes/ownerRoutes.js";
import { paymentRoutes } from "./routes/paymentRoutes.js";
import { showRoutes } from "./routes/showRoutes.js";
import { theaterRoutes } from "./routes/theaterRoutes.js";
import { tmdbRoutes } from "./routes/tmdbRoutes.js";
import { uploadRoutes } from "./routes/uploadRoutes.js";
import { connectDatabase, isMongoReady } from "./services/database.js";
import { createSeatHoldStore } from "./services/seatHoldService.js";
import { createRateLimiter } from "./middleware/rateLimit.js";
import { requestContext } from "./middleware/requestContext.js";
import { xssSanitize } from "./middleware/sanitize.js";
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

if (env.isProduction) {
  app.use((request, response, next) => {
    if (request.secure || request.headers["x-forwarded-proto"] === "https") return next();
    response.redirect(301, `https://${request.hostname}${request.originalUrl}`);
  });
}

app.use(requestContext);
app.use(
  morgan(env.isProduction ? "combined" : "dev", {
    stream: { write: (message) => logger.info(message.trim()) },
  }),
);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(cors(corsOptions));
app.use(express.json({ limit: "12mb" }));
app.use(mongoSanitize());
app.use(xssSanitize);

await connectDatabase();

const seatHolds = createSeatHoldStore();
const { router: bookingRoutes, getBookedSeats } = createBookingRoutes({ io, seatHolds });
registerSeatSockets(io, { getBookedSeats, seatHolds });
registerNotificationSockets(io);

jobQueue.register("email:booking", async ({ booking }) => {
  await sendBookingEmail(booking);
});
jobQueue.register("email:notification", async ({ email, subject, content }) => {
  await sendNotificationEmail(email, subject, content);
});
jobQueue.register("email:otp", async ({ email, otp, options }) => {
  await sendOtpEmail(email, otp, options);
});

function mountApi(prefix) {
  app.get(`${prefix}/health`, (_request, response) => {
    const emailStatus = getEmailProviderStatus();
    response.json({
      ok: true,
      service: "movix API",
      version: "v1",
      database: isMongoReady() ? "MongoDB connected" : "Local memory store",
      socket: "enabled",
      seats: "Booked and held-seat sync",
      notifications: "Live notifications enabled",
      email: emailStatus.label,
      payment: "Demo payment",
      uploads: env.cloudinaryUrl || env.cloudinaryCloudName ? "Cloudinary configured" : "Disabled",
    });
  });

  app.use(prefix, apiRateLimiter);
  app.use(`${prefix}/auth`, authRateLimiter);
  app.use(`${prefix}/payments`, paymentRateLimiter);
  app.use(`${prefix}/uploads`, uploadRateLimiter);

  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/auth`, googleAuthRoutes);
  app.use(`${prefix}/movies`, movieRoutes);
  app.use(`${prefix}/notifications`, notificationRoutes);
  app.use(`${prefix}/owner`, ownerRoutes);
  app.use(`${prefix}/theaters`, theaterRoutes);
  app.use(`${prefix}/shows`, showRoutes);
  app.use(`${prefix}/payments`, paymentRoutes);
  app.use(`${prefix}/admin`, adminRoutes);
  app.use(`${prefix}/uploads`, uploadRoutes);
  app.use(`${prefix}/tmdb`, tmdbRoutes);
  app.use(prefix, bookingRoutes);
}

mountApi("/api");
mountApi("/api/v1");

app.use(["/api", "/api/v1"], (request, response) => {
  response.status(404).json({ error: "API route not found.", requestId: request.id });
});

app.use((error, request, response, _next) => {
  logger.error(error.message || "Unhandled error", { stack: error.stack, requestId: request.id });

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
  logger.info(`movix API + Socket.IO running on http://localhost:${env.apiPort}`);
});

function shutdown(signal) {
  logger.warn(`${signal} received. Closing movix API server.`);
  httpServer.close(() => {
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
