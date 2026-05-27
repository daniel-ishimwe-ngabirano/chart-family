import { Server as SocketServer, Socket } from "socket.io";
import { getUserSocketIds } from "../index.js";
import { messageService } from "../../services/message.service.js";
import { pushService } from "../../services/push.service.js";
import { prisma } from "../../config/prisma.js";
import type { SocketWithUser } from "../../types/index.js";

export function setupChatHandlers(io: SocketServer, socket: SocketWithUser) {
  const userId = socket.userId!;

  socket.on("conversation:join", (conversationId: string) => {
    socket.join(conversationId);
  });

  socket.on("conversation:leave", (conversationId: string) => {
    socket.leave(conversationId);
  });

  socket.on("message:send", async (data) => {
    try {
      const message = await messageService.sendMessage({
        conversationId: data.conversationId,
        senderId: userId,
        text: data.text,
        type: data.type,
        replyToId: data.replyToId,
        metadata: data.metadata,
        attachments: data.attachments,
      });

      io.to(data.conversationId).emit("message:new", message);

      try {
        const conv = await prisma.conversation.findUnique({
          where: { id: data.conversationId },
          select: { members: { select: { userId: true, user: { select: { fullName: true, username: true } } } } },
        });
        const senderP = conv?.members.find((p) => p.userId === userId);
        const senderName = senderP?.user?.fullName || senderP?.user?.username || "Someone";
        const textPreview = data.text ? data.text.slice(0, 200) : (data.type === "image" ? "📷 Photo" : data.type === "file" ? "📎 File" : "New message");
        for (const p of conv?.members || []) {
          if (p.userId !== userId) {
            pushService.sendToUser(p.userId, {
              title: senderName,
              body: textPreview,
              icon: "/favicon.png",
              data: { url: "/chat", conversationId: data.conversationId },
            }).catch(() => {});
          }
        }
      } catch {}
    } catch (err) {
      socket.emit("error", { message: (err as Error).message });
    }
  });

  socket.on("message:edit", async ({ messageId, text }) => {
    try {
      const message = await messageService.editMessage(messageId, userId, text);
      io.to(message.conversationId).emit("message:updated", message);
    } catch (err) {
      socket.emit("error", { message: (err as Error).message });
    }
  });

  socket.on("message:delete", async ({ messageId, deleteForEveryone }) => {
    try {
      const message = await messageService.deleteMessage(messageId, userId, deleteForEveryone);
      const conversationId = message.conversationId;
      io.to(conversationId).emit("message:deleted", { messageId, conversationId, deleteForEveryone });
    } catch (err) {
      socket.emit("error", { message: (err as Error).message });
    }
  });

  socket.on("message:react", async ({ messageId, emoji, conversationId }) => {
    try {
      const result = await messageService.reactToMessage(messageId, userId, emoji);
      if (result) {
        io.to(conversationId).emit("message:reacted", {
          messageId,
          emoji,
          userId,
          reactions: result.reactions,
        });
      }
    } catch (err) {
      socket.emit("error", { message: (err as Error).message });
    }
  });

  socket.on("message:read", async ({ conversationId, messageId }) => {
    try {
      await messageService.markAsRead(messageId, userId);
      io.to(conversationId).emit("message:read", { messageId, userId, conversationId });
    } catch (err) {
      socket.emit("error", { message: (err as Error).message });
    }
  });

  socket.on("message:forward", async ({ messageId, toConversationId }) => {
    try {
      const message = await messageService.forwardMessage(messageId, toConversationId, userId);
      io.to(toConversationId).emit("message:new", message);
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

  socket.on("message:pin", async ({ conversationId, messageId }) => {
    try {
      const result = await messageService.pinMessage(conversationId, messageId, userId);
      io.to(conversationId).emit("message:pinned", { conversationId, messageId, userId, ...result });
    } catch (err) {
      socket.emit("error", { message: (err as Error).message });
    }
  });
}
