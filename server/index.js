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
import { paymentRoutes } from "./routes/paymentRoutes.js";
import { showRoutes } from "./routes/showRoutes.js";
import { theaterRoutes } from "./routes/theaterRoutes.js";
import { connectDatabase, isMongoReady } from "./services/database.js";
import { registerSeatSockets } from "./sockets/seatSocket.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: env.clientOrigin,
    credentials: true,
  },
});

app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

await connectDatabase();

const { router: bookingRoutes, getBookedSeats } = createBookingRoutes({ io });
registerSeatSockets(io, { getBookedSeats });

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    service: "moviex API",
    database: isMongoReady() ? "MongoDB connected" : "Local memory store",
    socket: "enabled",
    seats: "Booked-seat sync only",
    email: env.brevoApiKey ? "Brevo connected" : "Email provider not configured",
    payment:
      env.paymentProvider === "razorpay" && env.razorpayKeyId && env.razorpayKeySecret
        ? "Razorpay connected"
        : "Local test checkout",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/theaters", theaterRoutes);
app.use("/api/shows", showRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", bookingRoutes);

app.use((error, _request, response, _next) => {
  console.error(error);
  response
    .status(error.status ?? 500)
    .json({ error: error.status ? error.message : "Something went wrong in the API." });
});

httpServer.listen(env.apiPort, () => {
  console.log(`moviex API + Socket.IO running on http://localhost:${env.apiPort}`);
});
