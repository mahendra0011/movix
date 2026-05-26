import bcrypt from "bcryptjs";
import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth, signToken } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { cleanDocument, isMongoReady } from "../services/database.js";
import { sendOtpEmail } from "../services/emailService.js";

const router = Router();
const memoryUsers = new Map();

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

router.post(
  "/register",
  asyncHandler(async (request, response) => {
    const { name, email, password, role = "user" } = request.body;
    const normalizedEmail = String(email ?? "")
      .trim()
      .toLowerCase();

    if (!name || !normalizedEmail || !password) {
      response.status(400).json({ error: "Name, email, and password are required." });
      return;
    }

    const safeRole = ["user", "theater-owner", "admin"].includes(role) ? role : "user";
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

    const cleanUser = publicUser(user);
    response.status(201).json({ user: cleanUser, token: signToken(cleanUser) });
  }),
);

router.post(
  "/login",
  asyncHandler(async (request, response) => {
    const email = String(request.body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(request.body.password ?? "");
    const user = isMongoReady() ? await User.findOne({ email }) : findMemoryUser(email);

    if (!user || !(await bcrypt.compare(password, user.passwordHash ?? ""))) {
      response.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const cleanUser = publicUser(user);
    response.json({ user: cleanUser, token: signToken(cleanUser) });
  }),
);

router.post(
  "/google",
  asyncHandler(async (request, response) => {
    const email = String(request.body.email ?? "")
      .trim()
      .toLowerCase();
    const name = String(request.body.name ?? email.split("@")[0] ?? "Google User");

    if (!email) {
      response.status(400).json({ error: "Google email is required for the demo OAuth flow." });
      return;
    }

    let user = isMongoReady() ? await User.findOne({ email }) : findMemoryUser(email);
    if (!user) {
      user = isMongoReady()
        ? await User.create({
            name,
            email,
            role: "user",
            googleId: request.body.googleId ?? "demo",
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
    const email = String(request.body.email ?? "")
      .trim()
      .toLowerCase();
    const user = isMongoReady() ? await User.findOne({ email }) : findMemoryUser(email);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (user) {
      if (isMongoReady()) {
        await User.updateOne({ email }, { otpHash, otpExpiresAt });
      } else {
        user.otpHash = otpHash;
        user.otpExpiresAt = otpExpiresAt;
      }
      await sendOtpEmail(email, otp);
    }

    response.json({ ok: true, message: "If the account exists, an OTP has been sent." });
  }),
);

router.post(
  "/verify-otp",
  asyncHandler(async (request, response) => {
    const email = String(request.body.email ?? "")
      .trim()
      .toLowerCase();
    const otp = String(request.body.otp ?? "");
    const user = isMongoReady() ? await User.findOne({ email }) : findMemoryUser(email);

    if (!user || !user.otpHash || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      response.status(400).json({ error: "OTP is invalid or expired." });
      return;
    }

    const ok = await bcrypt.compare(otp, user.otpHash);
    if (!ok) {
      response.status(400).json({ error: "OTP is invalid or expired." });
      return;
    }

    if (isMongoReady()) {
      await User.updateOne(
        { email },
        { $set: { verified: true, otpHash: "" }, $unset: { otpExpiresAt: 1 } },
      );
    } else {
      user.verified = true;
      user.otpHash = "";
      user.otpExpiresAt = undefined;
    }

    response.json({ ok: true });
  }),
);

router.get("/me", requireAuth, (request, response) => {
  response.json({ user: request.user ?? request.auth });
});

export { router as authRoutes };
