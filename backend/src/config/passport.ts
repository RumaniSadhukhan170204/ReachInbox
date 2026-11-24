import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import { env } from "./env";
import { prisma } from "./db";

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${env.BACKEND_URL}/api/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error("Google account did not provide an email"));
        }

        const user = await prisma.user.upsert({
          where: { googleId: profile.id },
          update: {
            email,
            name: profile.displayName,
            avatar: profile.photos?.[0]?.value ?? null,
          },
          create: {
            googleId: profile.id,
            email,
            name: profile.displayName,
            avatar: profile.photos?.[0]?.value ?? null,
          },
        });

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

export default passport;