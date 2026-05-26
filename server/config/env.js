import dotenv from "dotenv";

dotenv.config();

function parseOrigins(value) {
  if (!value || value === "*") return true;
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const env = {
  apiPort: Number(process.env.API_PORT ?? process.env.PORT ?? 4000),
  clientOrigin: parseOrigins(process.env.CLIENT_ORIGIN ?? "*"),
  mongoUri: process.env.MONGODB_URI,
  mongoDb: process.env.MONGODB_DB,
  redisUrl: process.env.REDIS_URL,
  jwtSecret: process.env.JWT_SECRET ?? "bookmyscreen-dev-secret",
  lockTtlMs: Number(process.env.SEAT_LOCK_TTL_MS ?? 5 * 60 * 1000),
  brevoApiKey: process.env.BREVO_API_KEY ?? process.env.BRAVO_API_KEY,
  brevoApiUrl: process.env.BREVO_API_URL ?? "https://api.brevo.com/v3/smtp/email",
  brevoFromEmail: process.env.BREVO_FROM_EMAIL ?? process.env.BRAVO_FROM_EMAIL,
  brevoFromName: process.env.BREVO_FROM_NAME ?? "BookMyScreen",
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  paymentProvider: process.env.PAYMENT_PROVIDER ?? "local",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
  adminEmail: (process.env.ADMIN_EMAIL ?? "mahendrapra0077@gmail.com").toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD ?? "mahendra@123",
};

export { env };
