import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { cleanDocument, isMongoReady } from "../services/database.js";
import { User } from "../models/User.js";

function signToken(user) {
  return jwt.sign(
    { sub: user.id || user._id?.toString(), role: user.role, email: user.email },
    env.jwtSecret,
    {
      expiresIn: "7d",
    },
  );
}

async function requireAuth(request, response, next) {
  const header = request.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    request.auth = payload;

    if (isMongoReady() && payload.sub) {
      const user = await User.findById(payload.sub).lean();
      request.user = cleanDocument(user);
    }

    next();
  } catch {
    response.status(401).json({ error: "Invalid or expired token." });
  }
}

function requireRole(...roles) {
  return (request, response, next) => {
    const role = request.user?.role ?? request.auth?.role;
    if (!roles.includes(role)) {
      response.status(403).json({ error: "You do not have access to this resource." });
      return;
    }
    next();
  };
}

export { requireAuth, requireRole, signToken };
