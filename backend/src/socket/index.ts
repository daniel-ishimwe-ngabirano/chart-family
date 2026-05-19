import { Server as SocketServer } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { getRedis, isRedisConnected } from "../config/redis.js";
import { prisma } from "../config/prisma.js";
import { setupChatHandlers } from "./handlers/chat.handler.js";
import { setupPresenceHandlers } from "./handlers/presence.handler.js";
import { setupCallHandlers } from "./handlers/call.handler.js";
import type { SocketWithUser } from "../types/index.js";

const userSocketMap = new Map<string, Set<string>>();
let _io: SocketServer | undefined;

export function getIO(): SocketServer {
  if (!_io) throw new Error("Socket.IO not initialized");
  return _io;
}

export function getUserSocketIds(userId: string): string[] {
  return Array.from(userSocketMap.get(userId) || []);
}

export function isUserOnline(userId: string): boolean {
  return userSocketMap.has(userId) && (userSocketMap.get(userId)?.size || 0) > 0;
}

export async function setupSocket(httpServer: HttpServer): Promise<SocketServer> {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: [env.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });
  _io = io;

  // Redis adapter for scaling (optional, requires @socket.io/redis-adapter)
  if (isRedisConnected()) {
    try {
      const { createAdapter } = await import("@socket.io/redis-adapter");
      const redis = getRedis();
      const pubClient = redis.duplicate();
      const subClient = redis.duplicate();
      io.adapter(createAdapter(pubClient, subClient) as any);
      console.log("Socket.IO using Redis adapter");
    } catch {
      console.warn("Redis adapter not available, running without cluster support");
    }
  }

  // Auth middleware
  io.use((socket: SocketWithUser, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token as string;
      if (!token) {
        return next(new Error("Authentication required"));
      }
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string; sessionId?: string };
      socket.userId = decoded.userId;
      socket.sessionId = decoded.sessionId;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket: SocketWithUser) => {
    const userId = socket.userId!;
    console.log(`User connected: ${userId} (socket: ${socket.id})`);

    // Track user sockets
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId)!.add(socket.id);

    // Update user online status
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: true, lastSeen: new Date() },
    });
    io!.emit("user:online", { userId, sockets: getUserSocketIds(userId).length });

    // Setup handlers
    setupChatHandlers(io!, socket);
    setupPresenceHandlers(io!, socket);
    setupCallHandlers(io!, socket);

    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${userId} (socket: ${socket.id})`);

      const sockets = userSocketMap.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSocketMap.delete(userId);
          await prisma.user.update({
            where: { id: userId },
            data: { isOnline: false, lastSeen: new Date() },
          });
          io!.emit("user:offline", { userId });
        }
      }
    });
  });

  return io;
}
