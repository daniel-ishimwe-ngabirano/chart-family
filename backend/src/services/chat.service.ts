import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

export class ChatService {
  async getConversations(userId: string) {
    const memberships = await prisma.conversationMember.findMany({
      where: { userId },
      select: { conversationId: true },
    });

    const conversationIds = memberships.map((m) => m.conversationId);

    const conversations = await prisma.conversation.findMany({
      where: { id: { in: conversationIds } },
      orderBy: { updatedAt: "desc" },
      include: {
        members: {
          include: {
            user: { select: { id: true, fullName: true, username: true, avatar: true, isOnline: true, lastSeen: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    return conversations.map((conv) => ({
      ...conv,
      id: conv.id,
      members: conv.members,
      lastMessage: conv.messages[0] || null,
      messages: undefined,
    }));
  }

  async getOrCreateConversation(userId: string, otherUserId: string) {
    if (userId === otherUserId) throw new AppError("Cannot chat with yourself", 400);

    const userConversationIds = (
      await prisma.conversationMember.findMany({
        where: { userId },
        select: { conversationId: true },
      })
    ).map((m) => m.conversationId);

    const existingMembership = await prisma.conversationMember.findFirst({
      where: {
        userId: otherUserId,
        conversationId: { in: userConversationIds },
      },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                user: { select: { id: true, fullName: true, username: true, avatar: true, isOnline: true, lastSeen: true, bio: true } },
              },
            },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: { sender: { select: { id: true, fullName: true } } },
            },
          },
        },
      },
    });

    if (existingMembership && !existingMembership.conversation.isGroup) {
      const conv = existingMembership.conversation;
      return {
        ...conv,
        id: conv.id,
        members: conv.members,
        lastMessage: conv.messages[0] || null,
        messages: undefined,
      };
    }

    const conversation = await prisma.conversation.create({
      data: { isGroup: false },
    });

    await prisma.conversationMember.createMany({
      data: [
        { conversationId: conversation.id, userId, role: "admin" },
        { conversationId: conversation.id, userId: otherUserId, role: "member" },
      ],
    });

    const userData = await prisma.user.findMany({
      where: { id: { in: [userId, otherUserId] } },
      select: { id: true, fullName: true, username: true, avatar: true, isOnline: true, lastSeen: true, bio: true },
    });

    const members = userData.map((u) => ({ user: u }));

    return { ...conversation, id: conversation.id, members, lastMessage: null };
  }

  async getMessages(conversationId: string, userId: string, cursor?: string, limit = 50) {
    const member = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member) throw new AppError("Not a member of this conversation", 403);

    const where: Record<string, unknown> = { conversationId, deletedForEveryone: false };
    if (cursor) where.createdAt = { lt: new Date(cursor) };

    const messages = await prisma.message.findMany({
      where: where as any,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      include: {
        sender: { select: { id: true, fullName: true, username: true, avatar: true } },
        replyTo: { select: { id: true, text: true, type: true, sender: { select: { id: true, fullName: true } } } },
        attachments: true,
        reactions: true,
        readReceipts: { select: { userId: true, readAt: true } },
      },
    });

    const hasMore = messages.length > limit;
    const result = hasMore ? messages.slice(0, limit) : messages;

    return {
      messages: result.reverse(),
      nextCursor: hasMore ? result[0]?.createdAt?.toISOString() : null,
    };
  }

  async getMedia(conversationId: string, userId: string, type?: string, cursor?: string, limit = 30) {
    const member = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member) throw new AppError("Not a member of this conversation", 403);

    const where: Record<string, unknown> = {
      conversationId,
      deletedForEveryone: false,
      attachments: { some: {} },
    };

    if (type === "image") where.type = { in: ["IMAGE", "IMAGE_GIF"] };
    else if (type === "video") where.type = { in: ["VIDEO", "VIDEO_NOTE"] };
    else if (type === "audio") where.type = { in: ["AUDIO", "VOICE_NOTE"] };
    else if (type === "file") where.type = "FILE";

    if (cursor) where.createdAt = { lt: new Date(cursor) };

    const messages = await prisma.message.findMany({
      where: where as any,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      include: {
        attachments: true,
        sender: { select: { id: true, fullName: true } },
      },
    });

    const hasMore = messages.length > limit;
    const result = hasMore ? messages.slice(0, limit) : messages;

    const media = result.flatMap((msg) =>
      (msg.attachments || []).map((att) => ({
        ...att,
        messageId: msg.id,
        senderId: msg.senderId,
        senderName: msg.sender?.fullName,
        createdAt: msg.createdAt,
      }))
    );

    return {
      media,
      nextCursor: hasMore ? result[result.length - 1]?.createdAt?.toISOString() : null,
    };
  }

  async searchMessages(conversationId: string, userId: string, query: string) {
    const member = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member) throw new AppError("Not a member of this conversation", 403);

    return prisma.message.findMany({
      where: {
        conversationId,
        text: { contains: query },
        deletedForEveryone: false,
      },
      include: { sender: { select: { id: true, fullName: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async saveDraft(userId: string, conversationId: string, text?: string, metadata?: Record<string, unknown>) {
    return prisma.draft.upsert({
      where: { userId_conversationId: { userId, conversationId } },
      update: { text, metadata: metadata as any },
      create: { userId, conversationId, text, metadata: metadata as any },
    });
  }

  async getDraft(userId: string, conversationId: string) {
    return prisma.draft.findUnique({
      where: { userId_conversationId: { userId, conversationId } },
    });
  }

  async deleteDraft(userId: string, conversationId: string) {
    await prisma.draft.deleteMany({
      where: { userId, conversationId },
    });
  }

  async markConversationRead(userId: string, conversationId: string) {
    await prisma.conversationMember.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: new Date() },
    });
  }
}

export const chatService = new ChatService();
