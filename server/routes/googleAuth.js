import { Router } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { signToken } from "../middleware/auth.js";
import { isMongoReady } from "../services/database.js";

if (env.googleClientId && env.googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.googleClientId,
        clientSecret: env.googleClientSecret,
        callbackURL: env.googleCallbackUrl,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("Google account has no email."));

          let user;
          if (isMongoReady()) {
            user = await User.findOne({ email });
            if (!user) {
              user = await User.create({
                name: profile.displayName,
                email,
                role: "user",
                verified: true,
                status: "Active",
              });
            }
          }
          done(null, user);
        } catch (error) {
          done(error);
        }
      },
    ),
  );
}

const router = Router();

router.get(
  "/google",
  (req, res, next) => {
    if (!env.googleClientId || !env.googleClientSecret) {
      res.status(400).json({ error: "Google OAuth is not configured." });
      return;
    }
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"], session: false }),
);

function spaOrigin() {
  if (typeof env.clientOrigin === "string" && env.clientOrigin) return env.clientOrigin;
  return "";
}

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${spaOrigin() || ""}/auth?error=google-auth-failed`,
  }),
  (req, res) => {
    if (!req.user) {
      res.redirect(`${spaOrigin() || "/"}/auth?error=google-auth-failed`);
      return;
    }

    const token = signToken(req.user);
    const userData = encodeURIComponent(
      JSON.stringify({
        id: req.user._id?.toString() || req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      }),
    );
    res.redirect(`${spaOrigin()}/auth?token=${token}&user=${userData}`);
  },
);

export { router as googleAuthRoutes };
