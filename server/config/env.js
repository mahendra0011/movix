import dotenv from "dotenv";

dotenv.config();

function parseOrigins(value) {
  if (!value || value === "*") return true;
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function readEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return undefined;
}

const env = {
  apiPort: Number(process.env.PORT ?? process.env.API_PORT ?? 4000),
  clientOrigin: parseOrigins(process.env.CLIENT_ORIGIN ?? "*"),
  mongoUri: process.env.MONGODB_URI,
  mongoDb: process.env.MONGODB_DB ?? "moviex",
  jwtSecret: process.env.JWT_SECRET ?? "moviex-dev-secret",
  brevoApiKey: readEnv("BRAVO_API_KEY", "BREVO_API_KEY"),
  // Brevo names its HTTP transactional email route /smtp/email; this is not SMTP auth.
  brevoApiUrl: process.env.BREVO_API_URL ?? "https://api.brevo.com/v3/smtp/email",
  brevoFromEmail: readEnv("BRAVO_FROM_EMAIL", "BREVO_FROM_EMAIL"),
  brevoFromName: readEnv("BRAVO_FROM_NAME", "BREVO_FROM_NAME") ?? "moviex",
  paymentProvider: process.env.PAYMENT_PROVIDER ?? "local",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
  adminEmail: (process.env.ADMIN_EMAIL ?? "mahendrapra0077@gmail.com").toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD ?? "mahendra@123",
};

export { env };
