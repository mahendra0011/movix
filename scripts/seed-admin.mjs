import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import dns from "node:dns";

dotenv.config();

dns.setServers(["8.8.8.8", "1.1.1.1"]);

function readEnv(key) {
  const value = process.env[key];
  if (!value) return "";
  return String(value)
    .trim()
    .replace(/^[`'"]+|[`'"]+$/g, "")
    .trim();
}

const MONGO_URI = readEnv("MONGODB_URI");
const DB_NAME = readEnv("MONGODB_DB") || "movix";
const ADMIN_EMAIL = readEnv("ADMIN_EMAIL");
const ADMIN_PASSWORD = readEnv("ADMIN_PASSWORD");
const ADMIN_NAME = readEnv("ADMIN_NAME") || "Admin";

const DEMO_ACCOUNTS = [
  {
    name: "Demo Admin",
    email: "admin@demo.com",
    password: "demo@1234",
    role: "admin",
    verified: true,
    ownerStatus: "Approved",
  },
  {
    name: "Demo Theater Owner",
    email: "owner@demo.com",
    password: "demo@1234",
    role: "theater-owner",
    verified: true,
    ownerStatus: "Approved",
  },
  {
    name: "Demo User",
    email: "user@demo.com",
    password: "demo@1234",
    role: "user",
    verified: true,
    ownerStatus: "Approved",
  },
];

async function seed() {
  if (!MONGO_URI) {
    console.error("MONGODB_URI is not set in .env");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db;
  console.log(`Connected to database: ${DB_NAME}\n`);

  // ensure collections exist
  const existing = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name),
  );
  if (!existing.has("users")) await db.createCollection("users");

  const User =
    mongoose.models.User ||
    mongoose.model("User", new mongoose.Schema({}, { strict: false, collection: "users" }));

  // seed admin from env
  console.log(`Seeding admin from env: ${ADMIN_EMAIL}...`);
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await User.updateOne(
    { email: ADMIN_EMAIL },
    {
      $set: {
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        passwordHash: adminHash,
        role: "admin",
        verified: true,
        blocked: false,
        status: "Active",
      },
    },
    { upsert: true },
  );
  console.log(`  Admin "${ADMIN_NAME}" seeded.\n`);

  // seed demo accounts
  for (const account of DEMO_ACCOUNTS) {
    console.log(`Seeding demo ${account.role}: ${account.email}...`);
    const hash = await bcrypt.hash(account.password, 10);
    await User.updateOne(
      { email: account.email },
      {
        $set: {
          name: account.name,
          email: account.email,
          passwordHash: hash,
          role: account.role,
          verified: account.verified,
          ownerStatus: account.ownerStatus,
          blocked: false,
          status: "Active",
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );
    console.log(`  ${account.name} (${account.email} / ${account.password}) seeded.`);
  }

  console.log("\nAll accounts seeded successfully!");
  await mongoose.disconnect();
  console.log("Done.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
