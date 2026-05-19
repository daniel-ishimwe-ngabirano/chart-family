import { v4 as uuidv4 } from "uuid";
import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

export class GroupService {
  async createGroup(data: { groupName: string; groupAvatar?: string; adminId: string; participantIds: string[] }) {
    const allParticipants = [...new Set([data.adminId, ...data.participantIds])];
    const inviteCode = uuidv4().slice(0, 8);

    const conversation = await prisma.conversation.create({
      data: {
        isGroup: true,
        groupName: data.groupName,
        groupAvatar: data.groupAvatar || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(data.groupName)}`,
        groupAdminId: data.adminId,
        inviteCode,
        members: {
          createMany: {
            data: allParticipants.map((userId) => ({
              userId,
              role: userId === data.adminId ? "admin" : "member",
            })),
          },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, fullName: true, username: true, avatar: true, isOnline: true } },
          },
        },
      },
    });

    return {
      ...conversation,
      id: conversation.id,
      members: conversation.members.map((m: { user: unknown }) => m.user),
    };
  }

  async joinGroupViaInvite(inviteCode: string, userId: string) {
    const conversation = await prisma.conversation.findUnique({ where: { inviteCode } });
    if (!conversation) throw new AppError("Invalid invite code", 404);
    if (!conversation.isGroup) throw new AppError("Not a group conversation", 400);

    const existing = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: conversation.id, userId } },
    });
    if (existing) throw new AppError("Already a member", 400);

    await prisma.conversationMember.create({
      data: { conversationId: conversation.id, userId, role: "member" },
    });

    const members = await prisma.conversationMember.findMany({
      where: { conversationId: conversation.id },
      include: {
        user: { select: { id: true, fullName: true, username: true, avatar: true, isOnline: true } },
      },
    });

    return {
      ...conversation,
      id: conversation.id,
      members: members.map((m: { user: unknown }) => m.user),
    };
  }

  async updateMemberRole(conversationId: string, adminId: string, targetUserId: string, role: string) {
    const admin = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: adminId } },
    });
    if (!admin || admin.role !== "admin") throw new AppError("Only admins can change roles", 403);

    return prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId: targetUserId } },
      data: { role },
    });
  }

  async removeMember(conversationId: string, adminId: string, targetUserId: string) {
    const admin = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: adminId } },
    });
    if (!admin || admin.role !== "admin") throw new AppError("Only admins can remove members", 403);
    await prisma.conversationMember.deleteMany({
      where: { conversationId, userId: targetUserId },
    });
  }

  async leaveGroup(conversationId: string, userId: string) {
    await prisma.conversationMember.deleteMany({
      where: { conversationId, userId },
    });
  }

  async updateGroupInfo(conversationId: string, userId: string, data: { groupName?: string; groupAvatar?: string }) {
    const member = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member || member.role !== "admin") throw new AppError("Only admins can update group info", 403);

    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data,
    });

    const members = await prisma.conversationMember.findMany({
      where: { conversationId },
      include: {
        user: { select: { id: true, fullName: true, username: true, avatar: true, isOnline: true } },
      },
    });

    return { ...conversation, members: members.map((m: { user: unknown }) => m.user) };
  }

  async createPoll(data: {
    conversationId: string; userId: string; question: string;
    options: string[]; isAnonymous?: boolean; isMultipleChoice?: boolean; expiresInHours?: number;
  }) {
    const member = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: data.conversationId, userId: data.userId } },
    });
    if (!member) throw new AppError("Not a member of this conversation", 403);

    const poll = await prisma.poll.create({
      data: {
        conversationId: data.conversationId,
        createdById: data.userId,
        question: data.question,
        isAnonymous: data.isAnonymous || false,
        isMultipleChoice: data.isMultipleChoice || false,
        expiresAt: data.expiresInHours ? new Date(Date.now() + data.expiresInHours * 3600000) : null,
        options: {
          createMany: {
            data: data.options.map((text) => ({ text })),
          },
        },
      },
      include: { options: true },
    });

    return poll;
  }

  async votePoll(pollId: string, optionId: string, userId: string) {
    const poll = await prisma.poll.findUnique({ where: { id: pollId }, include: { options: true } });
    if (!poll) throw new AppError("Poll not found", 404);
    if (poll.expiresAt && poll.expiresAt < new Date()) throw new AppError("Poll has expired", 400);

    if (!poll.isMultipleChoice) {
      await prisma.pollVote.deleteMany({ where: { pollId, userId } });
    }

    await prisma.pollVote.upsert({
      where: { pollId_userId: { pollId, userId } },
      update: { optionId },
      create: { pollId, optionId, userId },
    });

    const votes = await prisma.pollVote.findMany({
      where: { pollId },
      include: { user: { select: { id: true, fullName: true } } },
    });

    return {
      ...poll,
      options: poll.options.map((o) => ({
        ...o,
        votes: votes.filter((v) => v.optionId === o.id),
      })),
    };
  }
}

export const groupService = new GroupService();
