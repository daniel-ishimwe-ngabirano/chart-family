import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  conversationMember: { findUnique: vi.fn() },
  message: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  attachment: { createMany: vi.fn() },
  readReceipt: { create: vi.fn(), upsert: vi.fn() },
  conversation: { update: vi.fn() },
  pinnedMessage: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), findMany: vi.fn() },
  reaction: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), findMany: vi.fn() },
};

vi.mock("../config/prisma.js", () => ({
  prisma: mockPrisma,
}));

vi.mock("./admin.service.js", () => ({
  adminService: {
    checkTextForBadWords: vi.fn(),
  },
}));

vi.mock("./media.service.js", () => ({
  mediaService: {
    deleteFile: vi.fn(),
  },
}));

import { messageService } from "./message.service.js";
import { adminService } from "./admin.service.js";

describe("MessageService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.conversationMember.findUnique.mockResolvedValue({ role: "admin" });
    adminService.checkTextForBadWords.mockResolvedValue(false);
  });

  describe("sendMessage", () => {
    it("throws if user is not a member", async () => {
      mockPrisma.conversationMember.findUnique.mockResolvedValue(null);
      await expect(messageService.sendMessage({
        conversationId: "conv1",
        senderId: "user1",
        text: "hello",
      })).rejects.toThrow("Not a member of this conversation");
    });

    it("throws if text contains bad words", async () => {
      adminService.checkTextForBadWords.mockResolvedValue(true);
      mockPrisma.message.create.mockResolvedValue({ id: "msg1" });

      await expect(messageService.sendMessage({
        conversationId: "conv1",
        senderId: "user1",
        text: "badword",
      })).rejects.toThrow("Message contains inappropriate content");
    });
  });

  describe("editMessage", () => {
    it("throws if message contains bad words", async () => {
      mockPrisma.message.findUnique.mockResolvedValue({ id: "msg1", senderId: "user1", isDeleted: false, text: "old" });
      adminService.checkTextForBadWords.mockResolvedValue(true);

      await expect(messageService.editMessage("msg1", "user1", "badword")).rejects.toThrow("Message contains inappropriate content");
    });
  });
});
