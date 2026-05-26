import { requestJson } from "@/shared/services/httpClient";

function register(input) {
  return requestJson("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

function login(input) {
  return requestJson("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

function googleLogin(input) {
  return requestJson("/api/auth/google", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

function forgotPassword(email) {
  return requestJson("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

function verifyOtp(input) {
  return requestJson("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export { forgotPassword, googleLogin, login, register, verifyOtp };
