import { Router } from "express";
import multer from "multer";
import { protectRoute } from "../middleware/auth.js";
import * as storyController from "../controllers/story.controller.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.get("/", protectRoute, storyController.getStories);
router.post("/", protectRoute, upload.single("media"), storyController.createStory);
router.delete("/:id", protectRoute, storyController.deleteStory);
router.post("/:id/view", protectRoute, storyController.viewStory);
router.get("/:id/views", protectRoute, storyController.getStoryViews);

export default router;
