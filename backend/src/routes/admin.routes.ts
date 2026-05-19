import { Router } from "express";
import * as adminController from "../controllers/admin.controller.js";
import { protectRoute } from "../middleware/auth.js";

const router = Router();

// Admin Auth
router.get("/auth/status", protectRoute, adminController.checkAdminPasswordStatus);
router.post("/auth/setup", protectRoute, adminController.setupAdminPassword);
router.post("/auth/login", protectRoute, adminController.loginAdmin);
router.post("/auth/logout", protectRoute, adminController.logoutAdmin);
router.get("/auth/verify", protectRoute, adminController.verifyAdminSession);

// Dashboard
router.get("/stats", protectRoute, adminController.getDashboardStats);
router.get("/server", protectRoute, adminController.getServerStats);

// Users
router.get("/users", protectRoute, adminController.getUsers);
router.post("/users", protectRoute, adminController.createUser);
router.put("/users/:userId", protectRoute, adminController.updateUser);
router.delete("/users/:userId", protectRoute, adminController.deleteUser);
router.post("/users/:userId/ban", protectRoute, adminController.banUser);
router.post("/users/:userId/unban", protectRoute, adminController.unbanUser);
router.delete("/messages/:messageId", protectRoute, adminController.deleteMessage);

// Feature Flags
router.get("/features", protectRoute, adminController.getFeatures);
router.put("/features/:name", protectRoute, adminController.toggleFeature);
router.get("/features/public", adminController.getPublicFeatures);

// Settings
router.get("/settings", protectRoute, adminController.getSettings);
router.put("/settings", protectRoute, adminController.updateSettings);

// Theme
router.get("/theme", protectRoute, adminController.getTheme);

// Logs
router.get("/logs", protectRoute, adminController.getLogs);

// Content Moderation
router.get("/reports", protectRoute, adminController.getReports);
router.put("/reports/:reportId", protectRoute, adminController.resolveReport);
router.get("/bad-words", protectRoute, adminController.getBadWords);
router.post("/bad-words", protectRoute, adminController.addBadWord);
router.delete("/bad-words/:wordId", protectRoute, adminController.removeBadWord);

// Notification Broadcasting
router.get("/broadcasts", protectRoute, adminController.getBroadcasts);
router.post("/broadcasts", protectRoute, adminController.createBroadcast);
router.delete("/broadcasts/:broadcastId", protectRoute, adminController.deleteBroadcast);
router.get("/broadcasts/active", adminController.getActiveBroadcasts);

// Navigation Builder
router.get("/nav-items", protectRoute, adminController.getNavItems);
router.post("/nav-items", protectRoute, adminController.createNavItem);
router.put("/nav-items/:navItemId", protectRoute, adminController.updateNavItem);
router.delete("/nav-items/:navItemId", protectRoute, adminController.deleteNavItem);
router.put("/nav-items/reorder", protectRoute, adminController.reorderNavItems);

// Role System
router.get("/roles", protectRoute, adminController.getUsersByRole);
router.get("/roles/list", protectRoute, adminController.getAvailableRoles);
router.put("/roles/:userId", protectRoute, adminController.updateUserRole);

// Page Sections
router.get("/page-sections", protectRoute, adminController.getPageSections);
router.put("/page-sections/:slug", protectRoute, adminController.upsertPageSection);

// Seed
router.post("/seed", protectRoute, adminController.seedAdminData);

export default router;
