import { Router } from "express";
import * as groupController from "../controllers/group.controller.js";
import { protectRoute } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createGroupSchema } from "../types/schemas.js";

const router = Router();

router.post("/", protectRoute, validate(createGroupSchema), groupController.createGroup);
router.post("/join/:inviteCode", protectRoute, groupController.joinGroup);
router.put("/:conversationId", protectRoute, groupController.updateGroupInfo);
router.put("/:conversationId/role", protectRoute, groupController.updateMemberRole);
router.delete("/:conversationId/members/:userId", protectRoute, groupController.removeMember);
router.post("/:conversationId/leave", protectRoute, groupController.leaveGroup);

// Polls
router.post("/polls", protectRoute, groupController.createPoll);
router.post("/polls/:pollId/vote", protectRoute, groupController.votePoll);

export default router;
