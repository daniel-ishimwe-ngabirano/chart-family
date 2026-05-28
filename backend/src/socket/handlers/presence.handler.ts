import { Server as SocketServer } from "socket.io";
import { validateSocketEvent } from "../../utils/socket-validate.js";
import { rateLimitSocket } from "../../utils/socket-rate-limit.js";
import { socketTypingSchema } from "../../types/schemas.js";
import type { SocketWithUser } from "../../types/index.js";

export function setupPresenceHandlers(io: SocketServer, socket: SocketWithUser) {
  const userId = socket.userId!;

  socket.on("typing:start", (data) => {
    if (!rateLimitSocket(socket.id, "typing:start", 20, 10_000)) return;
    try {
      const validated = validateSocketEvent(socketTypingSchema, data);
      socket.to(validated.conversationId).emit("typing:start", { conversationId: validated.conversationId, userId });
    } catch {}
  });

  socket.on("typing:stop", (data) => {
    if (!rateLimitSocket(socket.id, "typing:stop", 20, 10_000)) return;
    try {
      const validated = validateSocketEvent(socketTypingSchema, data);
      socket.to(validated.conversationId).emit("typing:stop", { conversationId: validated.conversationId, userId });
    } catch {}
  });

  socket.on("presence:update", ({ status }: { status: "online" | "away" | "busy" }) => {
    if (!rateLimitSocket(socket.id, "presence:update", 10, 30_000)) return;
    if (["online", "away", "busy"].includes(status)) {
      io.emit("presence:changed", { userId, status });
    }
  });
}
