import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

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

function parseOrigins(value) {
  if (!value) return false;
  if (value === "*") return true;
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const raw = {
  NODE_ENV: readEnv("NODE_ENV") ?? "development",
  PORT: readEnv("PORT", "API_PORT") ?? "4000",
  CLIENT_ORIGIN: readEnv("CLIENT_ORIGIN"),
  MONGODB_URI: readEnv("MONGODB_URI"),
  MONGODB_DB: readEnv("MONGODB_DB") ?? "movix",
  ALLOW_MEMORY_STORE: readEnv("ALLOW_MEMORY_STORE"),
  JWT_SECRET: readEnv("JWT_SECRET"),
  ADMIN_EMAIL: readEnv("ADMIN_EMAIL"),
  ADMIN_PASSWORD: readEnv("ADMIN_PASSWORD"),
  ADMIN_NAME: readEnv("ADMIN_NAME") ?? "Admin",
  GOOGLE_CLIENT_ID: readEnv("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: readEnv("GOOGLE_CLIENT_SECRET"),
  GOOGLE_CALLBACK_URL:
    readEnv("GOOGLE_CALLBACK_URL") ?? "http://localhost:4000/api/auth/google/callback",
  CLOUDINARY_URL: readEnv("CLOUDINARY_URL"),
  CLOUDINARY_CLOUD_NAME: readEnv("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY: readEnv("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: readEnv("CLOUDINARY_API_SECRET"),
  EMAIL_PROVIDER: readEnv("EMAIL_PROVIDER") ?? "auto",
  EMAIL_API_KEY: readEnv("EMAIL_API_KEY"),
  EMAIL_FROM_EMAIL: readEnv("EMAIL_FROM_EMAIL"),
  EMAIL_FROM_NAME: readEnv("EMAIL_FROM_NAME"),
  BREVO_API_KEY: readEnv("BRAVO_API_KEY", "BREVO_API_KEY"),
  BREVO_API_URL: readEnv("BREVO_API_URL") ?? "https://api.brevo.com/v3/smtp/email",
  BREVO_FROM_EMAIL: readEnv("BRAVO_FROM_EMAIL", "BREVO_FROM_EMAIL"),
  BREVO_FROM_NAME: readEnv("BRAVO_FROM_NAME", "BREVO_FROM_NAME"),
  RESEND_API_KEY: readEnv("RESEND_API_KEY"),
  RESEND_API_URL: readEnv("RESEND_API_URL") ?? "https://api.resend.com/emails",
  RESEND_FROM_EMAIL: readEnv("RESEND_FROM_EMAIL"),
  RESEND_FROM_NAME: readEnv("RESEND_FROM_NAME"),
};

const isProduction = raw.NODE_ENV === "production";

let env;

try {
  env = z
    .object({
      nodeEnv: z.string(),
      isProduction: z.boolean(),
      apiPort: z.coerce.number().positive().max(65535),
      clientOrigin: z.custom(
        (val) => val === false || val === true || Array.isArray(val),
        "Must be false, true, or an array of origins",
      ),
      clientOriginConfigured: z.boolean(),
      mongoUri: z.string().optional(),
      mongoDb: z.string(),
      allowMemoryStore: z.boolean(),
      jwtSecret: z
        .string()
        .min(isProduction ? 1 : 0, isProduction ? "JWT_SECRET required in production" : undefined)
        .optional(),
      emailProvider: z.enum(["auto", "brevo", "resend"]),
      emailFromName: z.string(),
      brevoApiKey: z.string().optional(),
      brevoApiUrl: z.string(),
      brevoFromEmail: z.string().optional(),
      brevoFromName: z.string(),
      resendApiKey: z.string().optional(),
      resendApiUrl: z.string(),
      resendFromEmail: z.string().optional(),
      resendFromName: z.string(),
      paymentProvider: z.literal("local"),
      googleClientId: z.string().optional(),
      googleClientSecret: z.string().optional(),
      googleCallbackUrl: z.string(),
      adminName: z.string(),
      cloudinaryUrl: z.string().optional(),
      cloudinaryCloudName: z.string().optional(),
      cloudinaryApiKey: z.string().optional(),
      cloudinaryApiSecret: z.string().optional(),
      adminEmail: z
        .string()
        .email(isProduction ? "ADMIN_EMAIL required in production" : undefined)
        .or(z.literal("")),
      adminPassword: z
        .string()
        .min(
          isProduction ? 1 : 0,
          isProduction ? "ADMIN_PASSWORD required in production" : undefined,
        )
        .optional(),
    })
    .refine((data) => !isProduction || data.clientOriginConfigured, {
      message: "CLIENT_ORIGIN is required in production",
    })
    .refine((data) => !isProduction || data.jwtSecret, {
      message: "JWT_SECRET is required in production",
    })
    .refine((data) => !isProduction || data.mongoUri || data.allowMemoryStore, {
      message: "MONGODB_URI is required in production unless ALLOW_MEMORY_STORE=true",
    })
    .parse({
      nodeEnv: raw.NODE_ENV,
      isProduction,
      apiPort: raw.PORT,
      clientOrigin: parseOrigins(raw.CLIENT_ORIGIN ?? (isProduction ? "" : "*")),
      clientOriginConfigured: Boolean(raw.CLIENT_ORIGIN),
      mongoUri: raw.MONGODB_URI || undefined,
      mongoDb: raw.MONGODB_DB,
      allowMemoryStore: raw.ALLOW_MEMORY_STORE === "true",
      jwtSecret: raw.JWT_SECRET ?? (isProduction ? undefined : "movix-dev-secret"),
      emailProvider: normalizeEmailProvider(raw.EMAIL_PROVIDER),
      emailFromName: raw.EMAIL_FROM_NAME ?? raw.BREVO_FROM_NAME ?? raw.RESEND_FROM_NAME ?? "movix",
      brevoApiKey:
        raw.BREVO_API_KEY ?? (raw.EMAIL_PROVIDER === "brevo" ? raw.EMAIL_API_KEY : undefined),
      brevoApiUrl: raw.BREVO_API_URL,
      brevoFromEmail:
        raw.BREVO_FROM_EMAIL ?? (raw.EMAIL_PROVIDER === "brevo" ? raw.EMAIL_FROM_EMAIL : undefined),
      brevoFromName: raw.BREVO_FROM_NAME ?? raw.EMAIL_FROM_NAME ?? "movix",
      resendApiKey:
        raw.RESEND_API_KEY ?? (raw.EMAIL_PROVIDER === "resend" ? raw.EMAIL_API_KEY : undefined),
      resendApiUrl: raw.RESEND_API_URL,
      resendFromEmail:
        raw.RESEND_FROM_EMAIL ??
        (raw.EMAIL_PROVIDER === "resend" ? raw.EMAIL_FROM_EMAIL : undefined),
      resendFromName: raw.RESEND_FROM_NAME ?? raw.EMAIL_FROM_NAME ?? raw.BREVO_FROM_NAME ?? "movix",
      paymentProvider: "local",
      googleClientId: raw.GOOGLE_CLIENT_ID || undefined,
      googleClientSecret: raw.GOOGLE_CLIENT_SECRET || undefined,
      googleCallbackUrl: raw.GOOGLE_CALLBACK_URL,
      adminName: raw.ADMIN_NAME,
      cloudinaryUrl: raw.CLOUDINARY_URL || undefined,
      cloudinaryCloudName: raw.CLOUDINARY_CLOUD_NAME || undefined,
      cloudinaryApiKey: raw.CLOUDINARY_API_KEY || undefined,
      cloudinaryApiSecret: raw.CLOUDINARY_API_SECRET || undefined,
      adminEmail: raw.ADMIN_EMAIL ?? (isProduction ? undefined : "mahendrapra0077@gmail.com"),
      adminPassword: raw.ADMIN_PASSWORD ?? (isProduction ? undefined : "mahendra@123"),
    });
} catch (error) {
  if (error instanceof z.ZodError) {
    const messages = error.errors.map((e) => e.message).join("; ");
    throw new Error(`Environment validation failed: ${messages}`);
  }
  throw error;
}

function normalizeEmailProvider(value) {
  const provider = String(value ?? "auto")
    .trim()
    .toLowerCase();
  return ["auto", "brevo", "resend"].includes(provider) ? provider : "auto";
}

export { env };
