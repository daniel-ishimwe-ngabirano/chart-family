import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../middleware/errorHandler.js";

export class AuthService {
  private generateAccessToken(payload: Record<string, string>): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
  }

  private generateRefreshToken(payload: Record<string, string>): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
  }

  async signup(data: { fullName: string; email?: string; phone?: string; password: string; username?: string }) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          ...(data.email ? [{ email: data.email }] : []),
          ...(data.phone ? [{ phone: data.phone }] : []),
          ...(data.username ? [{ username: data.username }] : []),
        ],
      },
    });

    if (existing) {
      if (existing.email === data.email) throw new AppError("Email already in use", 400);
      if (existing.phone === data.phone) throw new AppError("Phone already in use", 400);
      if (existing.username === data.username) throw new AppError("Username already taken", 400);
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const username = data.username || data.fullName.toLowerCase().replace(/\s+/g, "_") + Math.random().toString(36).slice(2, 6);

    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        ...(data.phone ? { phone: data.phone } : {}),
        password: hashedPassword,
        username,
        avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(data.fullName)}`,
        bio: "Hey there! I am using Chartfy",
      },
      select: {
        id: true, fullName: true, email: true, phone: true,
        username: true, avatar: true, bio: true, createdAt: true,
        role: true, isOnline: true,
      },
    });

    const sessionId = uuidv4();
    const accessToken = this.generateAccessToken({ userId: user.id, sessionId });
    const refreshToken = this.generateRefreshToken({ userId: user.id, sessionId });

    await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { user, accessToken, refreshToken, sessionId };
  }

  async login(data: { email?: string; phone?: string; password: string; deviceId?: string; deviceName?: string; deviceType?: string }) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(data.email ? [{ email: data.email }] : []),
          ...(data.phone ? [{ phone: data.phone }] : []),
        ],
      },
    });

    if (!user || !user.password) {
      throw new AppError("Invalid credentials", 401);
    }

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) throw new AppError("Invalid credentials", 401);

    const sessionId = uuidv4();
    const accessToken = this.generateAccessToken({ userId: user.id, sessionId });
    const refreshToken = this.generateRefreshToken({ userId: user.id, sessionId });

    await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshToken,
        userAgent: data.deviceName,
        ip: data.deviceType,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    if (data.deviceId) {
      await prisma.device.upsert({
        where: { userId_deviceId: { userId: user.id, deviceId: data.deviceId } },
        update: { deviceName: data.deviceName, deviceType: data.deviceType, lastActive: new Date() },
        create: { userId: user.id, deviceId: data.deviceId, deviceName: data.deviceName, deviceType: data.deviceType },
      });
    }

    return {
      user: {
        id: user.id, fullName: user.fullName, email: user.email,
        phone: user.phone, username: user.username, avatar: user.avatar, bio: user.bio,
        role: (user as any).role, isOnline: (user as any).isOnline,
      },
      accessToken, refreshToken, sessionId,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: string; sessionId: string };
      const session = await prisma.session.findUnique({ where: { id: decoded.sessionId } });

      if (!session || session.expiresAt < new Date()) {
        throw new AppError("Session expired", 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, fullName: true, email: true, avatar: true, username: true },
      });
      if (!user) throw new AppError("User not found", 404);

      const newAccessToken = this.generateAccessToken({ userId: user.id, sessionId: session.id });
      const newRefreshToken = this.generateRefreshToken({ userId: user.id, sessionId: session.id });

      await prisma.session.update({
        where: { id: session.id },
        data: { refreshToken: newRefreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      });

      return { user, accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Invalid refresh token", 401);
    }
  }

  async logout(sessionId?: string, allDevices = false, userId?: string) {
    if (allDevices && userId) {
      await prisma.session.deleteMany({ where: { userId } });
      return;
    }
    if (sessionId) {
      await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
    }
  }

  async getSessions(userId: string) {
    return prisma.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: { id: true, userAgent: true, ip: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found", 404);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async googleAuth(user: { id: string; fullName: string; email: string | null; avatar: string | null }, deviceData?: { deviceId?: string; deviceName?: string; deviceType?: string }) {
    const sessionId = uuidv4();
    const accessToken = this.generateAccessToken({ userId: user.id, sessionId });
    const refreshToken = this.generateRefreshToken({ userId: user.id, sessionId });

    await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshToken,
        userAgent: deviceData?.deviceName,
        ip: deviceData?.deviceType,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    if (deviceData?.deviceId) {
      await prisma.device.upsert({
        where: { userId_deviceId: { userId: user.id, deviceId: deviceData.deviceId } },
        update: { deviceName: deviceData.deviceName, deviceType: deviceData.deviceType, lastActive: new Date() },
        create: { userId: user.id, deviceId: deviceData.deviceId, deviceName: deviceData.deviceName, deviceType: deviceData.deviceType },
      });
    }

    return {
      user: { id: user.id, fullName: user.fullName, email: user.email, avatar: user.avatar },
      accessToken, refreshToken, sessionId,
    };
  }

  private otpStore = new Map<string, { otp: string; expiresAt: number }>();

  async sendPhoneOtp(phone: string): Promise<void> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.otpStore.set(phone, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });
    // In production, integrate with Twilio:
    // await twilioClient.messages.create({ body: `Your WaveChat OTP: ${otp}`, from: env.TWILIO_PHONE_NUMBER, to: phone });
    console.log(`[OTP] Sent to ${phone}: ${otp}`);
  }

  async verifyPhoneOtp(phone: string, otp: string): Promise<boolean> {
    const stored = this.otpStore.get(phone);
    if (!stored || Date.now() > stored.expiresAt) {
      this.otpStore.delete(phone);
      return false;
    }
    const valid = stored.otp === otp;
    if (valid) this.otpStore.delete(phone);
    return valid;
  }

  async requestPasswordReset(email: string): Promise<string> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError("If that email exists, a reset link was sent", 200);
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: resetToken, passwordResetExpires: resetExpires },
    });
    return resetToken;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { passwordResetToken: token, passwordResetExpires: { gt: new Date() } },
    });
    if (!user) throw new AppError("Invalid or expired reset token", 400);
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, passwordResetToken: null, passwordResetExpires: null },
    });
  }

  async phoneSignup(data: { fullName: string; phone?: string; email?: string; username?: string }) {
    const existing = data.phone
      ? await prisma.user.findFirst({ where: { phone: data.phone } })
      : data.email ? await prisma.user.findFirst({ where: { email: data.email } }) : null;
    if (existing) throw new AppError(data.phone ? "Phone already in use" : "Email already in use", 400);

    const username = data.username || `user_${Math.random().toString(36).slice(2, 8)}`;

    const createData: Record<string, unknown> = {
      fullName: data.fullName,
      username,
      isVerified: true,
      avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(data.fullName)}`,
      bio: "Hey there! I am using WaveChat",
    };
    if (data.phone) createData.phone = data.phone;
    if (data.email) createData.email = data.email;

    const user = await prisma.user.create({ data: createData as any });

    return { id: user.id, fullName: user.fullName, phone: user.phone, email: user.email, username: user.username, avatar: user.avatar };
  }
}

export const authService = new AuthService();
