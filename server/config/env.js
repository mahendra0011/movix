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
  brevoFromEmail: process.env.BREVO_FROM_EMAIL ?? process.env.BRAVO_FROM_EMAIL,
  brevoFromName: process.env.BREVO_FROM_NAME ?? "BookMyScreen",
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  paymentProvider: process.env.PAYMENT_PROVIDER ?? "local",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
};

export { env };
