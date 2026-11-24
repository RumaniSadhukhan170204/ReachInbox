
import { Router } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "../../config/db";
import { env } from "../../config/env";
import { authenticate } from "../../middleware/auth.middleware";
import {
  googleCallback,
  getProfile,
  logout
} from "./auth.controller";

const router = Router();

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
        passReqToCallback: false
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;

          if (!email) {
            return done(new Error("Google account has no email"));
          }

          const user = await prisma.user.upsert({
            where: { googleId: profile.id },
            update: {
              email,
              name: profile.displayName,
              avatar: profile.photos?.[0]?.value
            },
            create: {
              googleId: profile.id,
              email,
              name: profile.displayName,
              avatar: profile.photos?.[0]?.value
            }
          });

          done(null, user);
        } catch (error) {
          done(error as Error);
        }
      }
    )
  );
}

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/api/auth/failed"
  }),
  googleCallback
);

router.get("/failed", (_req, res) => {
  res.status(401).json({ message: "Google authentication failed" });
});

router.get("/me", authenticate, getProfile);
router.post("/logout", authenticate, logout);

export default router;
