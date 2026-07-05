import { baseRequest, HAS_CONFIGURED_API_URL } from "@/features/api/baseApi";
import { createOwnerApplication } from "@/shared/services/ownerApplications";

const LOCAL_USERS_KEY = "movix-local-auth-users";
const LOCAL_OTPS_KEY = "movix-local-auth-otps";
const STATIC_DEMO_OTP = "123456";
const STATIC_ADMIN = {
  id: "local-admin",
  name: "Mahendra Admin",
  email: "mahendrapra0077@gmail.com",
  password: "mahendra@123",
  role: "admin",
  verified: true,
};

function register(input) {
  if (shouldUseRemoteAuth()) {
    return baseRequest("/api/auth/register", {
      method: "POST",
      body: input,
    });
  }

  return localRegister(input);
}

function login(input) {
  if (shouldUseRemoteAuth()) {
    return baseRequest("/api/auth/login", {
      method: "POST",
      body: input,
    });
  }

  return localLogin(input);
}

function forgotPassword(email) {
  if (shouldUseRemoteAuth()) {
    return baseRequest("/api/auth/forgot-password", {
      method: "POST",
      body: { email },
    });
  }

  issueLocalOtp(email);
  return Promise.resolve({
    ok: true,
    message: `Static demo OTP is ${STATIC_DEMO_OTP}.`,
  });
}

function verifyOtp(input) {
  if (shouldUseRemoteAuth()) {
    return baseRequest("/api/auth/verify-otp", {
      method: "POST",
      body: input,
    });
  }

  return localVerifyOtp(input);
}

function resetPassword(input) {
  if (shouldUseRemoteAuth()) {
    return baseRequest("/api/auth/reset-password", {
      method: "POST",
      body: input,
    });
  }

  return localResetPassword(input);
}

function shouldUseRemoteAuth() {
  return HAS_CONFIGURED_API_URL;
}

function localRegister(input) {
  const name = String(input?.name ?? "").trim();
  const email = normalizeEmail(input?.email);
  const password = String(input?.password ?? "");
  const role = input?.role === "theater-owner" ? "theater-owner" : "user";

  if (!name || !email || password.length < 1) {
    throwLocalError("Name, email, and password are required.");
  }

  if (email === STATIC_ADMIN.email) {
    throwLocalError("This email is reserved for the admin account.", 409);
  }

  const users = readLocalUsers();
  if (role === "theater-owner" && !isOwnerApplicationComplete(input?.ownerApplication)) {
    throwLocalError("Complete theater owner application is required.", 400);
  }

  const existingIndex = users.findIndex((user) => normalizeEmail(user.email) === email);
  if (existingIndex !== -1) {
    if (users[existingIndex].verified) {
      throwLocalError("Email is already registered.", 409);
    }
    users[existingIndex] = buildLocalUser({
      id: users[existingIndex].id,
      input,
      name,
      email,
      password,
      role,
      verified: false,
    });
    writeLocalUsers(users);
    return Promise.resolve({
      ...issueLocalOtp(email, "verify-account"),
      message: "Account is pending email verification. OTP sent again to your email.",
    });
  }

  const user = buildLocalUser({
    id: `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    input,
    name,
    email,
    password,
    role,
    verified: false,
  });

  writeLocalUsers([...users, user]);
  return Promise.resolve(issueLocalOtp(email, "verify-account"));
}

function buildLocalUser({ id, input, name, email, password, role, verified }) {
  const user = {
    id,
    name,
    email,
    password,
    role,
    verified,
    ownerStatus: role === "theater-owner" ? "Pending" : "Approved",
  };

  if (role === "theater-owner") {
    const application = createOwnerApplication({
      user,
      application: input?.ownerApplication,
      status: "Pending",
    });
    user.ownerApplicationId = application.id;
    user.ownerApplication = application;
  }

  return user;
}

function localLogin(input) {
  const email = normalizeEmail(input?.email);
  const password = String(input?.password ?? "");
  const user = readLocalUsers().find((item) => normalizeEmail(item.email) === email);

  if (!user || user.password !== password) {
    throwLocalError("Invalid email or password.", 401);
  }

  if (user.blocked || user.status === "Blocked") {
    throwLocalError("This user account is blocked by admin.", 403);
  }

  if (user.verified) {
    const cleanUser = publicLocalUser(user);
    return Promise.resolve({ ok: true, user: cleanUser, token: createLocalToken(cleanUser) });
  }

  return Promise.resolve({
    ...issueLocalOtp(email, "verify-account"),
    message: "Email verification pending. OTP sent to your email.",
  });
}

function localVerifyOtp(input) {
  const email = normalizeEmail(input?.email);
  const otp = String(input?.otp ?? "").trim();
  const users = readLocalUsers();
  const index = users.findIndex((user) => normalizeEmail(user.email) === email);
  const user = users[index];

  if (user?.verified) {
    throwLocalError("Email is already verified. Please sign in.", 409);
  }

  if (!user || !isLocalOtpValid(email, otp)) {
    throwLocalError("OTP is invalid or expired.");
  }

  users[index] = { ...user, verified: true };
  writeLocalUsers(users);
  clearLocalOtp(email);

  const cleanUser = publicLocalUser(users[index]);
  return Promise.resolve({ ok: true, user: cleanUser, token: createLocalToken(cleanUser) });
}

function localResetPassword(input) {
  const email = normalizeEmail(input?.email);
  const otp = String(input?.otp ?? "").trim();
  const password = String(input?.password ?? "");

  if (!email || !otp || password.length < 8) {
    throwLocalError("Email, OTP, and an 8+ character password are required.");
  }

  const users = readLocalUsers();
  const index = users.findIndex((user) => normalizeEmail(user.email) === email);
  if (index === -1 || !isLocalOtpValid(email, otp)) {
    throwLocalError("OTP is invalid or expired.");
  }

  users[index] = { ...users[index], password, verified: true };
  writeLocalUsers(users);
  clearLocalOtp(email);
  return Promise.resolve({
    ok: true,
    message: "Password reset successful. Sign in with your new password.",
  });
}

function issueLocalOtp(email, purpose = "login") {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throwLocalError("Email is required.");
  const otps = readLocalOtps();
  otps[normalizedEmail] = {
    otp: STATIC_DEMO_OTP,
    purpose,
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
  writeLocalOtps(otps);
  return {
    requiresOtp: true,
    email: normalizedEmail,
    message: `Static demo OTP is ${STATIC_DEMO_OTP}.`,
  };
}

function isLocalOtpValid(email, otp) {
  const normalizedEmail = normalizeEmail(email);
  const record = readLocalOtps()[normalizedEmail];
  return Boolean(record && record.expiresAt > Date.now() && otp === record.otp);
}

function clearLocalOtp(email) {
  const normalizedEmail = normalizeEmail(email);
  const otps = readLocalOtps();
  delete otps[normalizedEmail];
  writeLocalOtps(otps);
}

function readLocalUsers() {
  const users = readJson(LOCAL_USERS_KEY, []);
  const hasAdmin = users.some((user) => normalizeEmail(user.email) === STATIC_ADMIN.email);
  return hasAdmin ? users : [STATIC_ADMIN, ...users];
}

function writeLocalUsers(users) {
  writeJson(LOCAL_USERS_KEY, users);
}

function readLocalOtps() {
  return readJson(LOCAL_OTPS_KEY, {});
}

function writeLocalOtps(otps) {
  writeJson(LOCAL_OTPS_KEY, otps);
}

function publicLocalUser(user) {
  const publicUser = { ...user };
  delete publicUser.password;
  return publicUser;
}

function isOwnerApplicationComplete(application = {}) {
  return Boolean(
    String(application.theaterName || application.name || "").trim() &&
    String(application.city || "").trim() &&
    String(application.address || "").trim() &&
    String(application.contact || "").trim() &&
    Number(application.screens || 0) >= 1,
  );
}

function createLocalToken(user) {
  return `local-${window.btoa(`${user.email}:${Date.now()}`)}`;
}

function normalizeEmail(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function readJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function throwLocalError(message, status = 400) {
  const error = new Error(message);
  error.response = { status, data: { error: message } };
  throw error;
}

export { forgotPassword, login, register, resetPassword, verifyOtp };
