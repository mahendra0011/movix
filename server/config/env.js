import dotenv from "dotenv";

dotenv.config();

function parseOrigins(value) {
  if (!value) return false;
  if (value === "*") return true;
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

function normalizeEmailProvider(value) {
  const provider = String(value ?? "auto")
    .trim()
    .toLowerCase();
  return ["auto", "brevo", "resend"].includes(provider) ? provider : "auto";
}

const nodeEnv = readEnv("NODE_ENV") ?? "development";
const isProduction = nodeEnv === "production";
const configuredClientOrigin = readEnv("CLIENT_ORIGIN");
const requestedEmailProvider = normalizeEmailProvider(readEnv("EMAIL_PROVIDER"));
const genericEmailApiKey = readEnv("EMAIL_API_KEY");
const genericEmailFromEmail = readEnv("EMAIL_FROM_EMAIL");
const genericEmailFromName = readEnv("EMAIL_FROM_NAME");
const brevoFromName =
  readEnv("BRAVO_FROM_NAME", "BREVO_FROM_NAME") ?? genericEmailFromName ?? "movix";
const resendFromName = readEnv("RESEND_FROM_NAME") ?? genericEmailFromName ?? brevoFromName;

const env = {
  nodeEnv,
  isProduction,
  apiPort: Number(readEnv("PORT", "API_PORT") ?? 4000),
  clientOrigin: parseOrigins(configuredClientOrigin ?? (isProduction ? "" : "*")),
  clientOriginConfigured: Boolean(configuredClientOrigin),
  mongoUri: readEnv("MONGODB_URI"),
  mongoDb: readEnv("MONGODB_DB") ?? "movix",
  allowMemoryStore: readEnv("ALLOW_MEMORY_STORE") === "true",
  jwtSecret: readEnv("JWT_SECRET") ?? (isProduction ? "" : "movix-dev-secret"),
  emailProvider: requestedEmailProvider,
  emailFromName: genericEmailFromName ?? brevoFromName ?? resendFromName,
  brevoApiKey:
    readEnv("BRAVO_API_KEY", "BREVO_API_KEY") ??
    (requestedEmailProvider === "brevo" ? genericEmailApiKey : undefined),
  // Brevo names its HTTP transactional email route /smtp/email; this is not SMTP auth.
  brevoApiUrl: readEnv("BREVO_API_URL") ?? "https://api.brevo.com/v3/smtp/email",
  brevoFromEmail:
    readEnv("BRAVO_FROM_EMAIL", "BREVO_FROM_EMAIL") ??
    (requestedEmailProvider === "brevo" ? genericEmailFromEmail : undefined),
  brevoFromName,
  resendApiKey:
    readEnv("RESEND_API_KEY") ??
    (requestedEmailProvider === "resend" ? genericEmailApiKey : undefined),
  resendApiUrl: readEnv("RESEND_API_URL") ?? "https://api.resend.com/emails",
  resendFromEmail:
    readEnv("RESEND_FROM_EMAIL") ??
    (requestedEmailProvider === "resend" ? genericEmailFromEmail : undefined),
  resendFromName,
  paymentProvider: readEnv("PAYMENT_PROVIDER") ?? "local",
  razorpayKeyId: readEnv("RAZORPAY_KEY_ID"),
  razorpayKeySecret: readEnv("RAZORPAY_KEY_SECRET"),
  cloudinaryUrl: readEnv("CLOUDINARY_URL"),
  cloudinaryCloudName: readEnv("CLOUDINARY_CLOUD_NAME"),
  cloudinaryApiKey: readEnv("CLOUDINARY_API_KEY"),
  cloudinaryApiSecret: readEnv("CLOUDINARY_API_SECRET"),
  adminEmail: (
    readEnv("ADMIN_EMAIL") ?? (isProduction ? "" : "mahendrapra0077@gmail.com")
  ).toLowerCase(),
  adminPassword: readEnv("ADMIN_PASSWORD") ?? (isProduction ? "" : "mahendra@123"),
};

validateProductionEnv(env);

function validateProductionEnv(config) {
  if (!config.isProduction) return;

  const missing = [];
  if (!config.clientOriginConfigured) missing.push("CLIENT_ORIGIN");
  if (!config.jwtSecret) missing.push("JWT_SECRET");
  if (!config.mongoUri && !config.allowMemoryStore) missing.push("MONGODB_URI");
  if (!config.adminEmail) missing.push("ADMIN_EMAIL");
  if (!config.adminPassword) missing.push("ADMIN_PASSWORD");

  if (missing.length) {
    throw new Error(
      `Production configuration is incomplete. Set ${missing.join(", ")} or explicitly opt in to local-only fallbacks.`,
    );
  }
}

export { env };
