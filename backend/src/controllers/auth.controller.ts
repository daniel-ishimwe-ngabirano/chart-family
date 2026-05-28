import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service.js";
import { notificationService } from "../services/notification.service.js";

export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, accessToken, refreshToken, sessionId } = await authService.signup(req.body);
    res.cookie("jwt", accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
    res.cookie("refreshToken", refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.status(201).json({ user, accessToken, sessionId });
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

    res.json({ user, accessToken, sessionId });
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
    res.clearCookie("jwt", COOKIE_OPTS);
    res.clearCookie("refreshToken", COOKIE_OPTS);
    res.json({ message: "Logged out successfully" });
  } catch (err) { next(err); }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getMe(req.userId!);
    res.json({ user, accessToken: req.cookies?.jwt || null });
  } catch (err) { next(err); }
}

export async function requestPasswordReset(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    if (!email) { res.status(400).json({ error: "Email is required" }); return; }
    const token = await authService.requestPasswordReset(email);
    try {
      await notificationService.sendEmail(email, "WaveChat - Password Reset",
        `<h2>Reset Your Password</h2><p>Click <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${token}">here</a> to reset your password.</p><p>This link expires in 1 hour.</p>`);
    } catch {}
    res.json({ message: "If that email exists, a reset link was sent" });
  } catch (err) { next(err); }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = req.body;
    if (!token || !password) { res.status(400).json({ error: "Token and password are required" }); return; }
    if (password.length < 6) { res.status(400).json({ error: "Password must be at least 6 characters" }); return; }
    await authService.resetPassword(token, password);
    res.json({ message: "Password reset successfully" });
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
    const { phone, email } = req.body;
    if (email) {
      const otp = await notificationService.sendEmailOtp(email);
      res.json({ message: "OTP sent to email" });
    } else if (phone) {
      await authService.sendPhoneOtp(phone);
      res.json({ message: "OTP sent successfully" });
    } else {
      res.status(400).json({ error: "Phone or email required" });
    }
  } catch (err) { next(err); }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone, email, otp, fullName, username } = req.body;
    if ((!phone && !email) || !otp) {
      res.status(400).json({ error: "Phone/email and OTP required" });
      return;
    }

    const isValid = email
      ? await notificationService.verifyOtp(email, otp)
      : await authService.verifyPhoneOtp(phone, otp);

    if (!isValid) {
      res.status(400).json({ error: "Invalid OTP" });
      return;
    }

    if (fullName) {
      const userData = email ? { fullName, email, username } : { fullName, phone, username };
      const user = await authService.phoneSignup(userData);
      const loginData = email ? { email, password: otp } : { phone, password: otp };
      const session = await authService.login(loginData) as any;
      res.cookie("jwt", session.accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
      res.cookie("refreshToken", session.refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });
      res.json({ user, accessToken: session.accessToken, sessionId: session.sessionId });
    } else {
      const loginData = email ? { email, password: otp } : { phone, password: otp };
      const existingUser = await authService.login(loginData).catch(() => null);
      if (existingUser) {
        res.cookie("jwt", existingUser.accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
        res.cookie("refreshToken", existingUser.refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });
        res.json({ user: existingUser.user, accessToken: existingUser.accessToken, sessionId: existingUser.sessionId });
      } else {
        res.json({ ...(email ? { email } : { phone }), otpVerified: true, requiresSignup: true });
      }
    }
  } catch (err) { next(err); }
}
