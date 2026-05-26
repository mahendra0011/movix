import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { env } from "./config/env.js";
import { adminRoutes } from "./routes/adminRoutes.js";
import { authRoutes } from "./routes/authRoutes.js";
import { createBookingRoutes } from "./routes/bookingRoutes.js";
import { movieRoutes } from "./routes/movieRoutes.js";
import { paymentRoutes } from "./routes/paymentRoutes.js";
import { showRoutes } from "./routes/showRoutes.js";
import { theaterRoutes } from "./routes/theaterRoutes.js";
import { connectDatabase, isMongoReady } from "./services/database.js";
import { connectRedis, isRedisReady } from "./services/redisClient.js";
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
await connectRedis();

const { router: bookingRoutes, getBookedSeats } = createBookingRoutes({ io });
registerSeatSockets(io, { getBookedSeats });

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    service: "BookMyScreen API",
    database: isMongoReady() ? "mongodb" : "memory",
    redis: isRedisReady() ? "connected" : "memory-locks",
    socket: "enabled",
    email: env.brevoApiKey ? "brevo" : "dry-run",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/theaters", theaterRoutes);
app.use("/api/shows", showRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", bookingRoutes);

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: "Something went wrong in the API." });
});

httpServer.listen(env.apiPort, () => {
  console.log(`BookMyScreen API + Socket.IO running on http://localhost:${env.apiPort}`);
});
