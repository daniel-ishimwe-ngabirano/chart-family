import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { stripHtmlTags, sanitizeHtml } from "../utils/index.js";
import { adminService } from "./admin.service.js";
import { mediaService } from "./media.service.js";

const MAX_MESSAGE_LENGTH = 10000;

export class MessageService {
  async sendMessage(data: {
    conversationId: string; senderId: string; text?: string; type?: string;
    replyToId?: string; scheduledAt?: Date; disappearsAt?: Date;
    metadata?: Record<string, unknown>;
    attachments?: Array<{ url: string; publicId?: string; fileName: string; fileSize: number; mimeType: string; width?: number; height?: number; duration?: number }>;
  }) {
    const member = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: data.conversationId, userId: data.senderId } },
    });
    if (!member) throw new AppError("Not a member of this conversation", 403);

    const text = sanitizeHtml(stripHtmlTags(data.text || "")).slice(0, MAX_MESSAGE_LENGTH);
    if (!text && !data.attachments?.length) {
      throw new AppError("Message text or attachment required", 400);
    }

    if (text && await adminService.checkTextForBadWords(text)) {
      throw new AppError("Message contains inappropriate content", 400);
    }

    const message = await prisma.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: data.senderId,
        text,
        type: data.type || "TEXT",
        replyToId: data.replyToId,
        scheduledAt: data.scheduledAt,
        disappearsAt: data.disappearsAt,
        metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
      },
    });

    if (data.attachments?.length) {
      await prisma.attachment.createMany({
        data: data.attachments.map((a) => ({
          messageId: message.id,
          url: a.url,
          publicId: a.publicId,
          fileName: a.fileName,
          fileSize: a.fileSize,
          mimeType: a.mimeType,
          width: a.width,
          height: a.height,
          duration: a.duration,
        })),
      });
    }

    await prisma.readReceipt.create({
      data: { messageId: message.id, userId: data.senderId },
    });

    await prisma.conversation.update({
      where: { id: data.conversationId },
      data: { updatedAt: new Date() },
    });

    return prisma.message.findUnique({
      where: { id: message.id },
      include: {
        sender: { select: { id: true, fullName: true, username: true, avatar: true } },
        replyTo: { select: { id: true, text: true, type: true, sender: { select: { id: true, fullName: true } } } },
        attachments: true,
        reactions: true,
        readReceipts: { select: { userId: true, readAt: true } },
      },
    });
  }

  async editMessage(messageId: string, userId: string, text: string) {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new AppError("Message not found", 404);
    if (message.senderId !== userId) throw new AppError("Unauthorized", 403);
    if (message.isDeleted) throw new AppError("Cannot edit deleted message", 400);

    const cleanText = sanitizeHtml(stripHtmlTags(text)).slice(0, MAX_MESSAGE_LENGTH);
    if (cleanText && await adminService.checkTextForBadWords(cleanText)) {
      throw new AppError("Message contains inappropriate content", 400);
    }
    return prisma.message.update({
      where: { id: messageId },
      data: { text: cleanText, isEdited: true },
      include: { sender: { select: { id: true, fullName: true, avatar: true } } },
    });
  }

  async deleteMessage(messageId: string, userId: string, deleteForEveryone = false) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { attachments: true },
    });
    if (!message) throw new AppError("Message not found", 404);
    if (message.senderId !== userId && deleteForEveryone) throw new AppError("Unauthorized", 403);

    if (deleteForEveryone && message.attachments?.length) {
      for (const att of message.attachments) {
        if (att.publicId) {
          await mediaService.deleteFile(att.publicId, "wavechat/messages").catch(() => {});
        }
      }
    }

    return prisma.message.update({
      where: { id: messageId },
      data: deleteForEveryone
        ? { deletedForEveryone: true, text: "" }
        : { isDeleted: true, text: "" },
    });
  }

  async reactToMessage(messageId: string, userId: string, emoji: string) {
    const existing = await prisma.reaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
    });

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.reaction.create({ data: { messageId, userId, emoji } });
    }

    const reactions = await prisma.reaction.findMany({ where: { messageId } });
    return { reactions, conversationId: (await prisma.message.findUnique({ where: { id: messageId }, select: { conversationId: true } }))?.conversationId };
  }

  async markAsRead(messageId: string, userId: string) {
    await prisma.readReceipt.upsert({
      where: { messageId_userId: { messageId, userId } },
      update: { readAt: new Date() },
      create: { messageId, userId, readAt: new Date() },
    });
  }

  async forwardMessage(messageId: string, toConversationId: string, userId: string) {
    const original = await prisma.message.findUnique({
      where: { id: messageId },
      include: { attachments: true },
    });
    if (!original) throw new AppError("Message not found", 404);

    return this.sendMessage({
      conversationId: toConversationId,
      senderId: userId,
      text: original.text || undefined,
      type: original.type,
      metadata: { forwardedFrom: original.senderId, originalMessageId: messageId },
      attachments: original.attachments.map((a) => ({
        url: a.url, fileName: a.fileName, fileSize: a.fileSize,
        mimeType: a.mimeType, width: a.width ?? undefined, height: a.height ?? undefined,
      })),
    });
  }

  async pinMessage(conversationId: string, messageId: string, userId: string) {
    const member = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member || !["admin", "moderator"].includes(member.role)) {
      throw new AppError("Only admins can pin messages", 403);
    }

    const existing = await prisma.pinnedMessage.findUnique({
      where: { conversationId_messageId: { conversationId, messageId } },
    });

    if (existing) {
      await prisma.pinnedMessage.delete({ where: { id: existing.id } });
      return { pinned: false };
    }

    await prisma.pinnedMessage.create({
      data: { conversationId, messageId, pinnedById: userId },
    });
    return { pinned: true };
  }

  async getPinnedMessages(conversationId: string) {
    return prisma.pinnedMessage.findMany({
      where: { conversationId },
      include: {
        message: {
          include: { sender: { select: { id: true, fullName: true, avatar: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const messageService = new MessageService();
