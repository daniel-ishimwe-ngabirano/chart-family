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

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many OTP requests, try again later" },
});

router.post("/signup", signupLimiter, validate(signupSchema), authController.signup);
router.post("/login", loginLimiter, validate(loginSchema), authController.login);
router.post("/refresh", authController.refreshToken);
router.post("/logout", protectRoute, authController.logout);
router.get("/me", protectRoute, authController.getMe);
router.get("/sessions", protectRoute, authController.getSessions);

// Google OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));
router.get("/google/callback", passport.authenticate("google", { session: false, failureRedirect: "/login" }), authController.googleCallback);

// Phone OTP
router.post("/send-otp", otpLimiter, authController.sendOtp);
router.post("/verify-otp", otpLimiter, authController.verifyOtp);

export default router;
