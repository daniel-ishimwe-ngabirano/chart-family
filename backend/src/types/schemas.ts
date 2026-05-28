import { z } from "zod";

export const signupSchema = z.object({
  fullName: z.string().min(2).max(50),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(15).optional(),
  password: z.string().min(6).max(100),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
}).refine(data => data.email || data.phone, {
  message: "Email or phone is required",
});

export const loginSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().min(1),
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
  deviceType: z.string().optional(),
}).refine(data => data.email || data.phone, {
  message: "Email or phone is required",
});

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  text: z.string().max(5000).optional(),
  type: z.enum(["TEXT", "IMAGE", "VIDEO", "VOICE_NOTE", "FILE", "STICKER", "GIF", "CONTACT", "LOCATION"]).default("TEXT"),
  replyToId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime().optional(),
  disappearsAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.union([z.string().max(1000), z.number(), z.boolean()])).optional(),
});

export const createGroupSchema = z.object({
  groupName: z.string().min(2).max(100),
  participantIds: z.array(z.string().uuid()).min(1),
  groupAvatar: z.string().optional(),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(50).optional(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  bio: z.string().max(150).optional(),
  avatar: z.string().optional(),
  phone: z.string().min(10).max(15).optional(),
});

export const createPollSchema = z.object({
  conversationId: z.string().uuid(),
  question: z.string().min(1).max(500),
  options: z.array(z.string().min(1).max(200)).min(2).max(10),
  isAnonymous: z.boolean().default(false),
  isMultipleChoice: z.boolean().default(false),
  expiresInHours: z.number().min(1).max(168).optional(),
});

const allowedMimeTypes = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "video/mp4", "video/webm",
  "audio/mpeg", "audio/ogg", "audio/wav", "audio/webm",
  "application/pdf", "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const allowedMimeTypesSet = new Set(allowedMimeTypes);

// Socket event schemas
export const socketSendMessageSchema = z.object({
  conversationId: z.string().min(1),
  text: z.string().max(10000).optional(),
  type: z.string().optional(),
  replyToId: z.string().optional(),
  metadata: z.record(z.string(), z.union([z.string().max(1000), z.number(), z.boolean()])).optional(),
  attachments: z.array(z.object({
    url: z.string().min(1),
    fileName: z.string().min(1),
    fileSize: z.number().max(50 * 1024 * 1024, "File too large (max 50MB)"),
    mimeType: z.string().refine((m) => m.startsWith("image/") || allowedMimeTypesSet.has(m), {
      message: "File type not allowed",
    }),
  })).max(10, "Max 10 files").optional(),
});

export const socketEditMessageSchema = z.object({
  messageId: z.string().min(1),
  text: z.string().min(1).max(10000),
});

export const socketDeleteMessageSchema = z.object({
  messageId: z.string().min(1),
  deleteForEveryone: z.boolean().optional(),
});

export const socketReactSchema = z.object({
  messageId: z.string().min(1),
  emoji: z.string().min(1).max(10),
  conversationId: z.string().min(1),
});

export const socketReadSchema = z.object({
  conversationId: z.string().min(1),
  messageId: z.string().min(1),
});

export const socketForwardSchema = z.object({
  messageId: z.string().min(1),
  toConversationId: z.string().min(1),
});

export const socketPinSchema = z.object({
  conversationId: z.string().min(1),
  messageId: z.string().min(1),
});

export const socketTypingSchema = z.object({
  conversationId: z.string().min(1),
});

export const socketCallStartSchema = z.object({
  receiverId: z.string().min(1),
  type: z.enum(["VOICE", "VIDEO"]),
  conversationId: z.string().min(1),
});

export const socketSignalSchema = z.object({
  to: z.string().min(1),
  offer: z.any().optional(),
  answer: z.any().optional(),
  candidate: z.any().optional(),
});
