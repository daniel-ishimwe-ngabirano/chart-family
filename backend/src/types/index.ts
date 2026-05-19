import { Socket } from "socket.io";

export interface AuthenticatedRequest {
  userId: string;
  sessionId?: string;
}

export interface SocketWithUser extends Socket {
  userId?: string;
  sessionId?: string;
}

export interface UserOnlineData {
  userId: string;
  socketId: string;
  status: "online" | "away" | "busy";
  lastSeen: Date;
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
}

export interface MessageEvent {
  conversationId: string;
  messageId: string;
  senderId: string;
  text?: string;
  type: string;
  metadata?: Record<string, unknown>;
  replyToId?: string;
  scheduledAt?: string;
  disappearsAt?: string;
}

export interface CallEvent {
  callId: string;
  conversationId?: string;
  callerId: string;
  receiverId: string;
  type: "VOICE" | "VIDEO";
}

export interface PresenceUpdate {
  userId: string;
  status: "online" | "offline" | "away";
  lastSeen?: Date;
}

export interface ReadReceiptEvent {
  conversationId: string;
  messageId: string;
  userId: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface FileUploadResult {
  url: string;
  publicId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
}
