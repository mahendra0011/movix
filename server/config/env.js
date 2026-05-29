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
    const value = cleanEnvValue(process.env[key]);
    if (value) return value;
  }
  return undefined;
}

function cleanEnvValue(value) {
  if (!value) return "";
  return String(value)
    .trim()
    .split(/\\n|\r?\n/)
    .at(0)
    .replace(/^[`'"]+|[`'"]+$/g, "")
    .trim();
}

const env = {
  apiPort: Number(readEnv("PORT", "API_PORT") ?? 4000),
  clientOrigin: parseOrigins(readEnv("CLIENT_ORIGIN") ?? "*"),
  mongoUri: readEnv("MONGODB_URI"),
  mongoDb: readEnv("MONGODB_DB") ?? "movix",
  jwtSecret: readEnv("JWT_SECRET") ?? "movix-dev-secret",
  brevoApiKey: readEnv("BRAVO_API_KEY", "BREVO_API_KEY"),
  // Brevo names its HTTP transactional email route /smtp/email; this is not SMTP auth.
  brevoApiUrl: readEnv("BREVO_API_URL") ?? "https://api.brevo.com/v3/smtp/email",
  brevoFromEmail: readEnv("BRAVO_FROM_EMAIL", "BREVO_FROM_EMAIL"),
  brevoFromName: readEnv("BRAVO_FROM_NAME", "BREVO_FROM_NAME") ?? "movix",
  paymentProvider: readEnv("PAYMENT_PROVIDER") ?? "local",
  razorpayKeyId: readEnv("RAZORPAY_KEY_ID"),
  razorpayKeySecret: readEnv("RAZORPAY_KEY_SECRET"),
  cloudinaryUrl: readEnv("CLOUDINARY_URL"),
  cloudinaryCloudName: readEnv("CLOUDINARY_CLOUD_NAME"),
  cloudinaryApiKey: readEnv("CLOUDINARY_API_KEY"),
  cloudinaryApiSecret: readEnv("CLOUDINARY_API_SECRET"),
  adminEmail: (readEnv("ADMIN_EMAIL") ?? "mahendrapra0077@gmail.com").toLowerCase(),
  adminPassword: readEnv("ADMIN_PASSWORD") ?? "mahendra@123",
};

export { env };
