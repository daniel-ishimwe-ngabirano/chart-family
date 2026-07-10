import { Server as SocketServer } from "socket.io";
import { getUserSocketIds } from "../index.js";
import { validateSocketEvent } from "../../utils/socket-validate.js";
import { socketCallStartSchema, socketSignalSchema, socketTypingSchema } from "../../types/schemas.js";
import type { SocketWithUser } from "../../types/index.js";

export function setupCallHandlers(io: SocketServer, socket: SocketWithUser) {
  const userId = socket.userId!;

  socket.on("call:start", (data) => {
    try {
      const validated = validateSocketEvent(socketCallStartSchema, data);
      const receiverSockets = getUserSocketIds(validated.receiverId);
      receiverSockets.forEach((sid) => {
        io.to(sid).emit("call:incoming", {
          callerId: userId,
          type: validated.type,
          conversationId: validated.conversationId,
        });
      });
    } catch (err) {
      socket.emit("error", { message: (err as Error).message });
    }
  });

  socket.on("call:start-with-offer", ({ receiverId, type, conversationId, offer }) => {
    const receiverSockets = getUserSocketIds(receiverId);
    receiverSockets.forEach((sid) => {
      io.to(sid).emit("call:incoming", {
        callerId: userId,
        type,
        conversationId,
      });
      io.to(sid).emit("signal:offer", { from: userId, offer });
    });
  });

  socket.on("call:accept", ({ callerId }) => {
    const callerSockets = getUserSocketIds(callerId);
    callerSockets.forEach((sid) => {
      io.to(sid).emit("call:accepted", { userId });
    });
  });

  socket.on("call:reject", ({ callerId }) => {
    const callerSockets = getUserSocketIds(callerId);
    callerSockets.forEach((sid) => {
      io.to(sid).emit("call:rejected", { userId });
    });
  });

  socket.on("call:end", ({ receiverId }) => {
    const receiverSockets = getUserSocketIds(receiverId);
    receiverSockets.forEach((sid) => {
      io.to(sid).emit("call:ended", { userId });
    });
  });

  socket.on("signal:offer", ({ to, offer }) => {
    const targetSockets = getUserSocketIds(to);
    targetSockets.forEach((sid) => {
      io.to(sid).emit("signal:offer", { from: userId, offer });
    });
  });

  socket.on("signal:answer", ({ to, answer }) => {
    const targetSockets = getUserSocketIds(to);
    targetSockets.forEach((sid) => {
      io.to(sid).emit("signal:answer", { from: userId, answer });
    });
  });

  socket.on("signal:ice-candidate", ({ to, candidate }) => {
    const targetSockets = getUserSocketIds(to);
    targetSockets.forEach((sid) => {
      io.to(sid).emit("signal:ice-candidate", { from: userId, candidate });
    });
  });
}
