import { Subscriber } from "../models/Subscriber.js";
import { isMongoReady } from "./database.js";

const memorySubscribers = new Set();

function normalizeEmail(email) {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function addSubscriber(email, source = "homepage") {
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    const error = new Error("Please enter a valid email address.");
    error.status = 400;
    throw error;
  }

  if (isMongoReady()) {
    await Subscriber.updateOne(
      { email: normalizedEmail },
      { $setOnInsert: { email: normalizedEmail, source } },
      { upsert: true },
    );
  } else {
    memorySubscribers.add(normalizedEmail);
  }

  return normalizedEmail;
}

async function listSubscriberEmails(limit = 500) {
  if (isMongoReady()) {
    const subscribers = await Subscriber.find({}, { email: 1 })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return subscribers.map((subscriber) => normalizeEmail(subscriber.email)).filter(Boolean);
  }

  return [...memorySubscribers].slice(0, limit);
}

export { addSubscriber, isValidEmail, listSubscriberEmails, normalizeEmail };
