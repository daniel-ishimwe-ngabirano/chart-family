import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "./prisma.js";
import { env } from "./env.js";

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          if (!profile.emails?.[0]?.value) {
            return done(new Error("No email from Google"), undefined);
          }

          let user = await prisma.user.findFirst({
            where: { googleId: profile.id },
          });

          if (user) {
            return done(null, user);
          }

          const email = profile.emails[0].value;
          user = await prisma.user.findUnique({ where: { email } });

          if (user) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { googleId: profile.id, isVerified: true },
            });
            return done(null, user);
          }

          user = await prisma.user.create({
            data: {
              email,
              fullName: profile.displayName,
              googleId: profile.id,
              isVerified: true,
              avatar: profile.photos?.[0]?.value || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(profile.displayName)}`,
              username: email.split("@")[0] + Math.random().toString(36).slice(2, 6),
              bio: "Hey there! I am using WaveChat",
            },
          });

          done(null, user);
        } catch (err) {
          done(err as Error, undefined);
        }
      }
    )
  );
} else {
  console.log("Google OAuth not configured — skipping");
}

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
