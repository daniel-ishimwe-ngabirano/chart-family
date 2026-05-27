import { Router } from "express";
import * as userController from "../controllers/user.controller.js";
import { protectRoute } from "../middleware/auth.js";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get("/", protectRoute, userController.getUsers);
router.get("/:userId", protectRoute, userController.getUserById);
router.put("/profile", protectRoute, userController.updateProfile);
router.post("/avatar", protectRoute, upload.single("avatar"), userController.uploadAvatar);
router.post("/block/:userId", protectRoute, userController.blockUser);
router.delete("/block/:userId", protectRoute, userController.unblockUser);
router.get("/blocked/list", protectRoute, userController.getBlockedUsers);
router.get("/starred/messages", protectRoute, userController.getStarredMessages);
router.post("/starred/:messageId", protectRoute, userController.starMessage);
router.delete("/starred/:messageId", protectRoute, userController.unstarMessage);
router.get("/push/vapid-key", userController.getVapidPublicKey);
router.put("/push/subscription", protectRoute, userController.savePushSubscription);
router.delete("/push/subscription", protectRoute, userController.removePushSubscription);

export default router;
