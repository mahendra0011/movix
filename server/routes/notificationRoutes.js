import { Router } from "express";
import { Subscriber } from "../models/Subscriber.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { isMongoReady } from "../services/database.js";

const router = Router();
const memorySubscribers = new Set();

function normalizeEmail(email) {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

router.post(
  "/subscribe",
  asyncHandler(async (request, response) => {
    const email = normalizeEmail(request.body.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      response.status(400).json({ error: "Please enter a valid email address." });
      return;
    }

    if (isMongoReady()) {
      await Subscriber.updateOne(
        { email },
        { $setOnInsert: { email, source: request.body.source ?? "homepage" } },
        { upsert: true },
      );
    } else {
      memorySubscribers.add(email);
    }

    response.status(201).json({ ok: true, message: "You are on the premiere alerts list." });
  }),
);

export { router as notificationRoutes };
