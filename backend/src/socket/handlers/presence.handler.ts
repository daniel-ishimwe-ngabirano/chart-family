import { Server as SocketServer } from "socket.io";
import type { SocketWithUser } from "../../types/index.js";

export function setupPresenceHandlers(io: SocketServer, socket: SocketWithUser) {
  const userId = socket.userId!;

  socket.on("typing:start", ({ conversationId }) => {
    socket.to(conversationId).emit("typing:start", { conversationId, userId });
  });

  socket.on("typing:stop", ({ conversationId }) => {
    socket.to(conversationId).emit("typing:stop", { conversationId, userId });
  });

  socket.on("presence:update", ({ status }: { status: "online" | "away" | "busy" }) => {
    io.emit("presence:changed", { userId, status });
  });
}
