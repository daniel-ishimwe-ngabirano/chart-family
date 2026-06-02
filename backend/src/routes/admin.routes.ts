import { Router } from "express";
import multer from "multer";
import * as adminController from "../controllers/admin.controller.js";
import { protectAdmin } from "../middleware/auth.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Admin Auth (no protectAdmin — uses env vars directly)
router.get("/auth/status", adminController.checkAdminPasswordStatus);
router.post("/auth/setup", adminController.setupAdminPassword);
router.post("/auth/login", adminController.loginAdmin);
router.post("/auth/logout", adminController.logoutAdmin);
router.put("/auth/change-password", adminController.changeAdminPassword);
router.get("/auth/verify", adminController.verifyAdminSession);

// Dashboard
router.get("/stats", protectAdmin, adminController.getDashboardStats);
router.get("/server", protectAdmin, adminController.getServerStats);

// Users
router.get("/users", protectAdmin, adminController.getUsers);
router.post("/users", protectAdmin, adminController.createUser);
router.put("/users/:userId", protectAdmin, adminController.updateUser);
router.delete("/users/:userId", protectAdmin, adminController.deleteUser);
router.post("/users/:userId/ban", protectAdmin, adminController.banUser);
router.post("/users/:userId/unban", protectAdmin, adminController.unbanUser);
router.delete("/messages/:messageId", protectAdmin, adminController.deleteMessage);

// Feature Flags
router.get("/features", protectAdmin, adminController.getFeatures);
router.put("/features/:name", protectAdmin, adminController.toggleFeature);
router.get("/features/public", adminController.getPublicFeatures);

// Settings
router.get("/settings", protectAdmin, adminController.getSettings);
router.put("/settings", protectAdmin, adminController.updateSettings);

// Theme
router.get("/theme", protectAdmin, adminController.getTheme);
router.get("/theme/public", adminController.getPublicTheme);

// Logs
router.get("/logs", protectAdmin, adminController.getLogs);

// Content Moderation
router.get("/reports", protectAdmin, adminController.getReports);
router.put("/reports/:reportId", protectAdmin, adminController.resolveReport);
router.get("/bad-words", protectAdmin, adminController.getBadWords);
router.post("/bad-words", protectAdmin, adminController.addBadWord);
router.delete("/bad-words/:wordId", protectAdmin, adminController.removeBadWord);

// Notification Broadcasting
router.get("/broadcasts", protectAdmin, adminController.getBroadcasts);
router.post("/broadcasts", protectAdmin, adminController.createBroadcast);
router.delete("/broadcasts/:broadcastId", protectAdmin, adminController.deleteBroadcast);
router.get("/broadcasts/active", adminController.getActiveBroadcasts);

// Navigation Builder
router.get("/nav-items", protectAdmin, adminController.getNavItems);
router.post("/nav-items", protectAdmin, adminController.createNavItem);
router.put("/nav-items/:navItemId", protectAdmin, adminController.updateNavItem);
router.delete("/nav-items/:navItemId", protectAdmin, adminController.deleteNavItem);
router.put("/nav-items/reorder", protectAdmin, adminController.reorderNavItems);

// Role System
router.get("/roles", protectAdmin, adminController.getUsersByRole);
router.get("/roles/list", protectAdmin, adminController.getAvailableRoles);
router.put("/roles/:userId", protectAdmin, adminController.updateUserRole);

// Page Sections
router.get("/page-sections", protectAdmin, adminController.getPageSections);
router.put("/page-sections/:slug", protectAdmin, adminController.upsertPageSection);

// File Upload
router.post("/upload", protectAdmin, upload.single("file"), adminController.uploadAdminFile);

// Seed
router.post("/seed", protectAdmin, adminController.seedAdminData);

export default router;
