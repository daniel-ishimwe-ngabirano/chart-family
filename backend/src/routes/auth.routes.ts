import { Router } from "express";
import passport from "passport";
import rateLimit from "express-rate-limit";
import * as authController from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { signupSchema, loginSchema } from "../types/schemas.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, try again later" },
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many accounts from this IP, try again later" },
});

const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many OTP requests, try again later" },
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many OTP verification attempts, try again later" },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many refresh requests, try again later" },
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password reset requests, try again later" },
});

router.post("/forgot-password", passwordResetLimiter, authController.requestPasswordReset);
router.post("/reset-password", passwordResetLimiter, authController.resetPassword);

router.post("/signup", signupLimiter, validate(signupSchema), authController.signup);
router.post("/login", loginLimiter, validate(loginSchema), authController.login);
router.post("/refresh", refreshLimiter, authController.refreshToken);
router.post("/logout", protectRoute, authController.logout);
router.get("/me", protectRoute, authController.getMe);
router.get("/sessions", protectRoute, authController.getSessions);

// Google OAuth
router.get("/google", (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/login`);
  }
  passport.authenticate("google", { scope: ["profile", "email"], session: false })(req, res, next);
});
router.get("/google/callback", (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/login`);
  }
  passport.authenticate("google", { session: false, failureRedirect: "/login" })(req, res, next);
}, authController.googleCallback);

// Phone OTP
router.post("/send-otp", otpSendLimiter, authController.sendOtp);
router.post("/verify-otp", otpVerifyLimiter, authController.verifyOtp);

// CSRF token endpoint (needed for cross-origin SPA — cookie can't be read cross-domain)
router.get("/csrf-token", (req, res) => {
  res.json({ csrfToken: req.cookies?.["csrf-token"] || "" });
});

export default router;
