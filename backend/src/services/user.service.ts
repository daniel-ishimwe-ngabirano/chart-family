import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

export class UserService {
  async getUsers(excludeUserId: string, search?: string) {
    const where: Record<string, unknown> = { id: { not: excludeUserId } };
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    return prisma.user.findMany({
      where: where as any,
      select: { id: true, fullName: true, email: true, username: true, avatar: true, bio: true, isOnline: true, lastSeen: true },
      orderBy: { fullName: "asc" },
    });
  }

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true, username: true, avatar: true, bio: true, isOnline: true, lastSeen: true, phone: true },
    });
    if (!user) throw new AppError("User not found", 404);
    return user;
  }

  async updateProfile(userId: string, data: { fullName?: string; username?: string; bio?: string; avatar?: string; phone?: string }) {
    if (data.username) {
      const existing = await prisma.user.findUnique({ where: { username: data.username } });
      if (existing && existing.id !== userId) throw new AppError("Username already taken", 400);
    }
    if (data.phone) {
      const existing = await prisma.user.findUnique({ where: { phone: data.phone } });
      if (existing && existing.id !== userId) throw new AppError("Phone already in use", 400);
    }

    return prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, fullName: true, email: true, username: true, avatar: true, bio: true, phone: true, role: true, isOnline: true, lastSeen: true, isVerified: true },
    });
  }

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) throw new AppError("Cannot block yourself", 400);
    await prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      update: {},
      create: { blockerId, blockedId },
    });
  }

  async unblockUser(blockerId: string, blockedId: string) {
    await prisma.block.delete({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    }).catch(() => {});
  }

  async getBlockedUsers(userId: string) {
    return prisma.block.findMany({
      where: { blockerId: userId },
      include: { blocked: { select: { id: true, fullName: true, username: true, avatar: true } } },
    });
  }

  async getStarredMessages(userId: string) {
    return prisma.starredMessage.findMany({
      where: { userId },
      include: {
        message: {
          include: { sender: { select: { id: true, fullName: true, avatar: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async starMessage(userId: string, messageId: string) {
    await prisma.starredMessage.upsert({
      where: { userId_messageId: { userId, messageId } },
      update: {},
      create: { userId, messageId },
    });
  }

  async unstarMessage(userId: string, messageId: string) {
    await prisma.starredMessage.delete({
      where: { userId_messageId: { userId, messageId } },
    }).catch(() => {});
  }
}

export const userService = new UserService();
