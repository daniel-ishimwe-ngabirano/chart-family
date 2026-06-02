import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { AppError } from "./errorHandler.js";
import { env } from "../config/env.js";

export async function protectRoute(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.jwt || req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      throw new AppError("Unauthorized - No token provided", 401);
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string; sessionId?: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { id: true, role: true } });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (user.role === "banned") {
      throw new AppError("Your account has been banned", 403);
    }

    req.userId = decoded.userId;
    req.sessionId = decoded.sessionId;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError("Unauthorized - Invalid token", 401));
    }
  }
}

export async function protectAdmin(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.admin_token;
    if (!token) throw new AppError("Unauthorized", 401);
    const payload = jwt.verify(token, env.ADMIN_JWT_SECRET) as { adminId: string };
    if (!payload?.adminId) throw new AppError("Unauthorized", 401);
    if (payload.adminId !== "env-admin") {
      const user = await prisma.user.findUnique({ where: { id: payload.adminId }, select: { id: true, role: true } });
      if (!user || user.role !== "admin") throw new AppError("Admin access required", 403);
    }
    req.userId = payload.adminId;
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError("Unauthorized", 401));
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = req.cookies?.jwt || req.headers.authorization?.replace("Bearer ", "");

    if (token) {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      req.userId = decoded.userId;
    }
  } catch {
    // Token invalid or expired - continue without auth
  }
  next();
}
