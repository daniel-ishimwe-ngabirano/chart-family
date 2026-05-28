import { Router } from "express";
import * as chatController from "../controllers/chat.controller.js";
import { protectRoute } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { sendMessageSchema } from "../types/schemas.js";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// Conversations
router.get("/", protectRoute, chatController.getConversations);

// Messages (must be before :conversationId routes to avoid conflict)
router.put("/messages/:messageId", protectRoute, chatController.editMessage);
router.delete("/messages/:messageId", protectRoute, chatController.deleteMessage);
router.post("/messages/:messageId/react", protectRoute, chatController.reactToMessage);
router.post("/messages/:messageId/forward", protectRoute, chatController.forwardMessage);
router.post("/messages/:messageId/pin", protectRoute, chatController.pinMessage);

router.get("/:conversationId/pinned", protectRoute, chatController.getPinnedMessages);
router.get("/:conversationId/media", protectRoute, chatController.getMedia);
router.get("/:conversationId/messages", protectRoute, chatController.getMessages);
router.get("/:conversationId/search", protectRoute, chatController.searchMessages);
router.post("/:conversationId/messages", protectRoute, upload.array("files", 10), validate(sendMessageSchema), chatController.sendMessage);
router.post("/:conversationId/read", protectRoute, chatController.markRead);

// Mute
router.post("/:conversationId/mute", protectRoute, chatController.muteConversation);

// Drafts
router.get("/:conversationId/draft", protectRoute, chatController.getDraft);
router.put("/:conversationId/draft", protectRoute, chatController.saveDraft);
router.delete("/:conversationId/draft", protectRoute, chatController.deleteDraft);

// Single conversation (keep last — :userId param catches everything)
router.get("/:userId", protectRoute, chatController.getOrCreateConversation);

export default router;
