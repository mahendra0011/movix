import bcrypt from "bcryptjs";
import { Router } from "express";
import { env } from "../config/env.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth, signToken } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { cleanDocument, isMongoReady } from "../services/database.js";
import { sendOtpEmail } from "../services/emailService.js";

const router = Router();
const memoryUsers = new Map();
const OTP_TTL_MS = 10 * 60 * 1000;

function normalizeEmail(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function createOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function publicUser(user) {
  return cleanDocument({
    id: user.id ?? user._id?.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    verified: Boolean(user.verified),
  });
}

function findMemoryUser(email) {
  return memoryUsers.get(String(email).toLowerCase());
}

async function findUserByEmail(email) {
  return isMongoReady() ? User.findOne({ email }) : findMemoryUser(email);
}

async function ensureDefaultAdminUser() {
  const existing = await findUserByEmail(env.adminEmail);
  if (existing) return existing;

  const passwordHash = await bcrypt.hash(env.adminPassword, 10);
  if (isMongoReady()) {
    return User.create({
      name: "Mahendra Admin",
      email: env.adminEmail,
      passwordHash,
      role: "admin",
      verified: true,
    });
  }

  const user = {
    id: `admin_${Date.now().toString(36)}`,
    name: "Mahendra Admin",
    email: env.adminEmail,
    passwordHash,
    role: "admin",
    verified: true,
  };
  memoryUsers.set(env.adminEmail, user);
  return user;
}

async function issueOtp(user, purpose = "login") {
  const otp = createOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

  if (isMongoReady()) {
    user.otpHash = otpHash;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();
  } else {
    user.otpHash = otpHash;
    user.otpExpiresAt = otpExpiresAt;
  }

  await sendOtpEmail(user.email, otp, { purpose });
  return {
    requiresOtp: true,
    email: user.email,
    message: "OTP sent to your email.",
  };
}

async function verifyUserOtp(user, otp) {
  if (!user || !user.otpHash || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    return false;
  }

  return bcrypt.compare(String(otp ?? ""), user.otpHash);
}

async function clearOtp(user) {
  user.otpHash = "";
  user.otpExpiresAt = undefined;
  if (isMongoReady()) await user.save();
}

async function verifyGoogleCredential(credential) {
  if (!env.googleClientId) {
    const error = new Error("Google OAuth is not configured.");
    error.status = 501;
    throw error;
  }

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
  );
  if (!response.ok) {
    const error = new Error("Google credential is invalid.");
    error.status = 401;
    throw error;
  }

  const profile = await response.json();
  if (profile.aud !== env.googleClientId || profile.email_verified !== "true") {
    const error = new Error("Google credential could not be verified.");
    error.status = 401;
    throw error;
  }

  return {
    email: String(profile.email).toLowerCase(),
    name: profile.name ?? profile.email.split("@")[0],
    googleId: profile.sub,
  };
}

router.post(
  "/register",
  asyncHandler(async (request, response) => {
    const { name, email, password, role = "user" } = request.body;
    const normalizedEmail = normalizeEmail(email);

    if (!name || !normalizedEmail || !password) {
      response.status(400).json({ error: "Name, email, and password are required." });
      return;
    }

    if (normalizedEmail === env.adminEmail) {
      response.status(409).json({ error: "This email is reserved for the admin account." });
      return;
    }

    const safeRole = role === "theater-owner" ? "theater-owner" : "user";
    const passwordHash = await bcrypt.hash(String(password), 10);
    let user;

    if (isMongoReady()) {
      const exists = await User.findOne({ email: normalizedEmail }).lean();
      if (exists) {
        response.status(409).json({ error: "Email is already registered." });
        return;
      }
      user = await User.create({ name, email: normalizedEmail, passwordHash, role: safeRole });
    } else {
      if (findMemoryUser(normalizedEmail)) {
        response.status(409).json({ error: "Email is already registered." });
        return;
      }
      user = {
        id: `mem_${Date.now().toString(36)}`,
        name,
        email: normalizedEmail,
        passwordHash,
        role: safeRole,
        verified: false,
      };
      memoryUsers.set(normalizedEmail, user);
    }

    response.status(201).json(await issueOtp(user, "verify-account"));
  }),
);

router.post(
  "/login",
  asyncHandler(async (request, response) => {
    const email = normalizeEmail(request.body.email);
    const password = String(request.body.password ?? "");
    let user = await findUserByEmail(email);

    if (!user && email === env.adminEmail && password === env.adminPassword) {
      user = await ensureDefaultAdminUser();
    }

    if (!user || !(await bcrypt.compare(password, user.passwordHash ?? ""))) {
      response.status(401).json({ error: "Invalid email or password." });
      return;
    }

    response.json(await issueOtp(user, "login"));
  }),
);

router.post(
  "/google",
  asyncHandler(async (request, response) => {
    if (!request.body.credential) {
      response.status(400).json({ error: "Google credential is required." });
      return;
    }

    let profile;
    try {
      profile = await verifyGoogleCredential(request.body.credential);
    } catch (error) {
      response.status(error.status ?? 500).json({ error: error.message });
      return;
    }

    const { email, name, googleId } = profile;
    let user = isMongoReady() ? await User.findOne({ email }) : findMemoryUser(email);
    if (!user) {
      user = isMongoReady()
        ? await User.create({
            name,
            email,
            role: "user",
            googleId,
          })
        : { id: `google_${Date.now().toString(36)}`, name, email, role: "user", verified: true };
      if (!isMongoReady()) memoryUsers.set(email, user);
    }

    const cleanUser = publicUser(user);
    response.json({ user: cleanUser, token: signToken(cleanUser) });
  }),
);

router.post(
  "/forgot-password",
  asyncHandler(async (request, response) => {
    const email = normalizeEmail(request.body.email);
    let user = await findUserByEmail(email);
    if (!user && email === env.adminEmail) {
      user = await ensureDefaultAdminUser();
    }

    if (user) {
      await issueOtp(user, "password-reset");
    }

    response.json({ ok: true, message: "If the account exists, an OTP has been sent." });
  }),
);

router.post(
  "/verify-otp",
  asyncHandler(async (request, response) => {
    const email = normalizeEmail(request.body.email);
    const otp = String(request.body.otp ?? "");
    const user = await findUserByEmail(email);

    if (!(await verifyUserOtp(user, otp))) {
      response.status(400).json({ error: "OTP is invalid or expired." });
      return;
    }

    user.verified = true;
    await clearOtp(user);

    const cleanUser = publicUser(user);
    response.json({ ok: true, user: cleanUser, token: signToken(cleanUser) });
  }),
);

router.post(
  "/reset-password",
  asyncHandler(async (request, response) => {
    const email = normalizeEmail(request.body.email);
    const otp = String(request.body.otp ?? "");
    const password = String(request.body.password ?? "");

    if (!email || !otp || password.length < 8) {
      response
        .status(400)
        .json({ error: "Email, OTP, and an 8+ character password are required." });
      return;
    }

    let user = await findUserByEmail(email);
    if (!user && email === env.adminEmail) {
      user = await ensureDefaultAdminUser();
    }

    if (!(await verifyUserOtp(user, otp))) {
      response.status(400).json({ error: "OTP is invalid or expired." });
      return;
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    user.verified = true;
    await clearOtp(user);

    response.json({
      ok: true,
      message: "Password reset successful. Sign in with your new password.",
    });
  }),
);

router.get("/me", requireAuth, (request, response) => {
  response.json({ user: request.user ?? request.auth });
});

export { router as authRoutes };
