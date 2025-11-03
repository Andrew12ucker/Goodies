// /server/config/oauth.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// basic user serialization for session
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// only register google if creds exist
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/api/oauth/google/callback"
      },
      async (accessToken, refreshToken, profile, done) => {
        // here you would upsert user in Mongo
        return done(null, {
          provider: "google",
          id: profile.id,
          displayName: profile.displayName,
          emails: profile.emails
        });
      }
    )
  );
} else {
  console.warn("⚠️ Google OAuth not configured — skipping strategy.");
}

module.exports = passport;
