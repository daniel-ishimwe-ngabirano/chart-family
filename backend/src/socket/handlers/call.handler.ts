import { Server as SocketServer } from "socket.io";
import { getUserSocketIds } from "../index.js";
import type { SocketWithUser } from "../../types/index.js";

export function setupCallHandlers(io: SocketServer, socket: SocketWithUser) {
  const userId = socket.userId!;

  socket.on("call:start", ({ receiverId, type, conversationId }) => {
    const receiverSockets = getUserSocketIds(receiverId);
    receiverSockets.forEach((sid) => {
      io.to(sid).emit("call:incoming", {
        callerId: userId,
        type,
        conversationId,
      });
    });
  });

  socket.on("call:accept", ({ callId, callerId }) => {
    const callerSockets = getUserSocketIds(callerId);
    callerSockets.forEach((sid) => {
      io.to(sid).emit("call:accepted", { callId, userId });
    });
  });

  socket.on("call:reject", ({ callId, callerId }) => {
    const callerSockets = getUserSocketIds(callerId);
    callerSockets.forEach((sid) => {
      io.to(sid).emit("call:rejected", { callId, userId });
    });
  });

  socket.on("call:end", ({ callId, receiverId }) => {
    const receiverSockets = getUserSocketIds(receiverId);
    receiverSockets.forEach((sid) => {
      io.to(sid).emit("call:ended", { callId, userId });
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
