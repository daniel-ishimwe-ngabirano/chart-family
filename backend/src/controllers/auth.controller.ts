import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service.js";

export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, accessToken, refreshToken, sessionId } = await authService.signup(req.body);
    res.cookie("jwt", accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
    res.cookie("refreshToken", refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.status(201).json({ user, accessToken, refreshToken, sessionId });
  } catch (err) { next(err); }
}

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" as const : "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, accessToken, refreshToken, sessionId } = await authService.login(req.body);

    res.cookie("jwt", accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
    res.cookie("refreshToken", refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.json({ user, accessToken, refreshToken, sessionId });
  } catch (err) { next(err); }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.refreshToken || req.body.refreshToken;
    if (!token) {
      res.status(401).json({ error: "Refresh token required" });
      return;
    }
    const result = await authService.refreshAccessToken(token);

    res.cookie("jwt", result.accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });

    res.json(result);
  } catch (err) { next(err); }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const allDevices = req.query.all === "true";
    await authService.logout(req.sessionId, allDevices, req.userId);
    res.clearCookie("jwt");
    res.clearCookie("refreshToken");
    res.json({ message: "Logged out successfully" });
  } catch (err) { next(err); }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getMe(req.userId!);
    res.json(user);
  } catch (err) { next(err); }
}

export async function getSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const sessions = await authService.getSessions(req.userId!);
    res.json(sessions);
  } catch (err) { next(err); }
}

export async function googleCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.googleAuth(req.user as any, {
      deviceId: req.body.deviceId,
      deviceName: req.body.deviceName,
      deviceType: req.body.deviceType,
    });

    res.cookie("jwt", result.accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
    res.cookie("refreshToken", result.refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}?auth=success`);
  } catch (err) { next(err); }
}

export async function sendOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({ error: "Phone number required" });
      return;
    }
    const otp = await authService.sendPhoneOtp(phone);
    // Store OTP in memory/cache for verification (in production, use Redis with TTL)
    // For demo, returning OTP (in production, send via SMS only)
    res.json({ message: "OTP sent successfully", otp: process.env.NODE_ENV === "development" ? otp : undefined });
  } catch (err) { next(err); }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone, otp, storedOtp, fullName, username } = req.body;
    if (!phone || !otp) {
      res.status(400).json({ error: "Phone and OTP required" });
      return;
    }

    const isValid = await authService.verifyPhoneOtp(phone, otp, storedOtp);
    if (!isValid) {
      res.status(400).json({ error: "Invalid OTP" });
      return;
    }

    if (fullName) {
      const user = await authService.phoneSignup({ fullName, phone, username });
      const session = await authService.login({ phone, password: otp }) as any;
      res.json({ user, ...session });
    } else {
      const existingUser = await authService.login({ phone, password: otp }).catch(() => null);
      if (existingUser) {
        res.json(existingUser);
      } else {
        res.json({ phone, otpVerified: true, requiresSignup: true });
      }
    }
  } catch (err) { next(err); }
}
