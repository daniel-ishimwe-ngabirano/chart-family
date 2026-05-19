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
  metadata: z.any().optional(),
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
