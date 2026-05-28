import { Server as SocketServer, Socket } from "socket.io";
import { getUserSocketIds } from "../index.js";
import { messageService } from "../../services/message.service.js";
import { pushService } from "../../services/push.service.js";
import { prisma } from "../../config/prisma.js";
import { validateSocketEvent } from "../../utils/socket-validate.js";
import { rateLimitSocket } from "../../utils/socket-rate-limit.js";
import {
  socketSendMessageSchema,
  socketEditMessageSchema,
  socketDeleteMessageSchema,
  socketReactSchema,
  socketReadSchema,
  socketForwardSchema,
  socketPinSchema,
  socketTypingSchema,
} from "../../types/schemas.js";
import type { SocketWithUser } from "../../types/index.js";

export function setupChatHandlers(io: SocketServer, socket: SocketWithUser) {
  const userId = socket.userId!;

  socket.on("conversation:join", (conversationId: string) => {
    if (typeof conversationId !== "string" || !conversationId) return;
    socket.join(conversationId);
  });

  socket.on("conversation:leave", (conversationId: string) => {
    if (typeof conversationId !== "string" || !conversationId) return;
    socket.leave(conversationId);
  });

  socket.on("message:send", async (data) => {
    if (!rateLimitSocket(socket.id, "message:send", 30, 60_000)) {
      socket.emit("error", { message: "Too many messages, slow down" });
      return;
    }
    try {
      const validated = validateSocketEvent(socketSendMessageSchema, data);
      const message = await messageService.sendMessage({
        conversationId: validated.conversationId,
        senderId: userId,
        text: validated.text,
        type: validated.type,
        replyToId: validated.replyToId,
        metadata: validated.metadata,
        attachments: validated.attachments,
      });

      io.to(validated.conversationId).emit("message:new", message);

      try {
        const conv = await prisma.conversation.findUnique({
          where: { id: validated.conversationId },
          select: { members: { select: { userId: true, user: { select: { fullName: true, username: true } } } } },
        });
        const senderP = conv?.members.find((p) => p.userId === userId);
        const senderName = senderP?.user?.fullName || senderP?.user?.username || "Someone";
        const textPreview = validated.text ? validated.text.slice(0, 200) : (validated.type === "image" ? "📷 Photo" : validated.type === "file" ? "📎 File" : "New message");
        for (const p of conv?.members || []) {
          if (p.userId !== userId) {
            pushService.sendToUser(p.userId, {
              title: senderName,
              body: textPreview,
              icon: "/favicon.png",
              data: { url: "/chat", conversationId: validated.conversationId },
            }).catch(() => {});
          }
        }
      } catch {}
    } catch (err) {
      socket.emit("error", { message: (err as Error).message });
    }
  });

  socket.on("message:edit", async (data) => {
    try {
      const validated = validateSocketEvent(socketEditMessageSchema, data);
      const message = await messageService.editMessage(validated.messageId, userId, validated.text);
      io.to(message.conversationId).emit("message:updated", message);
    } catch (err) {
      socket.emit("error", { message: (err as Error).message });
    }
  });

  socket.on("message:delete", async (data) => {
    try {
      const validated = validateSocketEvent(socketDeleteMessageSchema, data);
      const message = await messageService.deleteMessage(validated.messageId, userId, validated.deleteForEveryone);
      const conversationId = message.conversationId;
      io.to(conversationId).emit("message:deleted", { messageId: validated.messageId, conversationId, deleteForEveryone: validated.deleteForEveryone });
    } catch (err) {
      socket.emit("error", { message: (err as Error).message });
    }
  });

  socket.on("message:react", async (data) => {
    try {
      const validated = validateSocketEvent(socketReactSchema, data);
      const result = await messageService.reactToMessage(validated.messageId, userId, validated.emoji);
      if (result) {
        io.to(validated.conversationId).emit("message:reacted", {
          messageId: validated.messageId,
          emoji: validated.emoji,
          userId,
          reactions: result.reactions,
        });
      }
    } catch (err) {
      socket.emit("error", { message: (err as Error).message });
    }
  });

  socket.on("message:read", async (data) => {
    try {
      const validated = validateSocketEvent(socketReadSchema, data);
      await messageService.markAsRead(validated.messageId, userId);
      io.to(validated.conversationId).emit("message:read", { messageId: validated.messageId, userId, conversationId: validated.conversationId });
    } catch (err) {
      socket.emit("error", { message: (err as Error).message });
    }
  });

  socket.on("message:forward", async (data) => {
    try {
      const validated = validateSocketEvent(socketForwardSchema, data);
      const message = await messageService.forwardMessage(validated.messageId, validated.toConversationId, userId);
      io.to(validated.toConversationId).emit("message:new", message);
      const senderSockets = getUserSocketIds(userId);
      senderSockets.forEach((sid) => {
        if (sid !== socket.id) {
          io.to(sid).emit("message:new", message);
        }
      });
    } catch (err) {
      socket.emit("error", { message: (err as Error).message });
    }
  });

  socket.on("message:pin", async (data) => {
    try {
      const validated = validateSocketEvent(socketPinSchema, data);
      const result = await messageService.pinMessage(validated.conversationId, validated.messageId, userId);
      io.to(validated.conversationId).emit("message:pinned", { conversationId: validated.conversationId, messageId: validated.messageId, userId, ...result });
    } catch (err) {
      socket.emit("error", { message: (err as Error).message });
    }
  });
}
