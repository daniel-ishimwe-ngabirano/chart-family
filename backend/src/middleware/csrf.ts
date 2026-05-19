import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { AppError } from "./errorHandler.js";

const CSRF_COOKIE = "csrf-token";
const CSRF_HEADER = "x-csrf-token";

export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    next();
    return;
  }

  const token = req.headers[CSRF_HEADER] as string;
  const cookieToken = req.cookies?.[CSRF_COOKIE];

  if (!token || !cookieToken || token !== cookieToken) {
    next(new AppError("Invalid CSRF token", 403));
    return;
  }

  next();
}

export function setCsrfToken(req: Request, res: Response, next: NextFunction) {
  if (!req.cookies?.[CSRF_COOKIE]) {
    const token = crypto.randomBytes(32).toString("hex");
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    });
  }
  next();
}
