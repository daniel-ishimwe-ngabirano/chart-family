import { Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/errorHandler.js";
import { adminService } from "../services/admin.service.js";
import { notificationService } from "../services/notification.service.js";
import { mediaService } from "../services/media.service.js";
import { pageSectionService } from "../services/pageSection.service.js";
import { getIO } from "../socket/index.js";
import { env } from "../config/env.js";

const ADMIN_AUTH_COOKIE = "admin_token";

function setAdminCookie(res: Response, token: string) {
  res.cookie(ADMIN_AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    secure: env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000,
  });
}

function clearAdminCookie(res: Response) {
  res.clearCookie(ADMIN_AUTH_COOKIE, {
    httpOnly: true,
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
  });
}

async function checkAdmin(req: Request) {
  if (!req.userId) throw new AppError("Unauthorized", 401);
  await adminService.requireAdmin(req.userId);
}

// ========== DASHBOARD ==========

export async function getDashboardStats(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    const stats = await adminService.getDashboardStats();
    const mpm = await adminService.getMessagesPerMinute();
    res.json({ ...stats, messagesPerMinute: mpm });
  } catch (err) { next(err); }
}

export async function getServerStats(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    res.json(await adminService.getServerStats());
  } catch (err) { next(err); }
}

// ========== USERS ==========

export async function getUsers(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    res.json(await adminService.getUsers(page, limit, search));
  } catch (err) { next(err); }
}

export async function banUser(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    res.json(await adminService.banUser(String(req.params.userId), req.body.reason));
  } catch (err) { next(err); }
}

export async function unbanUser(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    res.json(await adminService.unbanUser(String(req.params.userId)));
  } catch (err) { next(err); }
}

export async function deleteMessage(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    res.json(await adminService.deleteMessage(String(req.params.messageId)));
  } catch (err) { next(err); }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    res.json(await adminService.createUser(req.body, req.userId!));
  } catch (err) { next(err); }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    res.json(await adminService.updateUser(String(req.params.userId), req.body, req.userId!));
  } catch (err) { next(err); }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    res.json(await adminService.deleteUser(String(req.params.userId), req.userId!));
  } catch (err) { next(err); }
}

// ========== FEATURE FLAGS ==========

export async function getFeatures(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    res.json(await adminService.getFeatures());
  } catch (err) { next(err); }
}

export async function toggleFeature(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    const name = req.params.name as string;
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") throw new AppError("enabled must be a boolean", 400);
    const feature = await adminService.toggleFeature(name, enabled, req.userId!);
    try { getIO().emit("features:updated", feature); } catch {}
    res.json(feature);
  } catch (err) { next(err); }
}

export async function getPublicFeatures(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await adminService.getPublicFeatures());
  } catch (err) { next(err); }
}

// ========== SETTINGS ==========

export async function getSettings(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    const group = typeof req.query.group === "string" ? req.query.group : undefined;
    res.json(await adminService.getSettings(group));
  } catch (err) { next(err); }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    const { settings } = req.body;
    if (!Array.isArray(settings)) throw new AppError("settings must be an array", 400);
    const updated = await adminService.updateSettings(settings, req.userId!);
    try { getIO().emit("settings:updated", updated); } catch {}
    res.json(updated);
  } catch (err) { next(err); }
}

// ========== LOGS ==========

export async function getLogs(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    const page = parseInt(req.query.page as string) || 1;
    res.json(await adminService.getLogs(page));
  } catch (err) { next(err); }
}

// ========== THEME ==========

export async function getTheme(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    res.json(await adminService.getTheme());
  } catch (err) { next(err); }
}

// ========== ADMIN AUTH ==========

export async function checkAdminPasswordStatus(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ hasPassword: await adminService.hasPassword() });
  } catch (err) { next(err); }
}

export async function setupAdminPassword(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.userId) throw new AppError("Unauthorized", 401);
    await adminService.requireAdmin(req.userId);
    const { password } = req.body;
    if (!password) throw new AppError("Password is required", 400);
    const token = await adminService.setupPassword(password, req.userId);
    setAdminCookie(res, token);
    res.json({ success: true, message: "Admin password created" });
  } catch (err) { next(err); }
}

export async function loginAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.userId) throw new AppError("Unauthorized", 401);
    await adminService.requireAdmin(req.userId);
    const { password } = req.body;
    if (!password) throw new AppError("Password is required", 400);
    const token = await adminService.loginPassword(password, req.userId);
    setAdminCookie(res, token);
    res.json({ success: true, message: "Admin authenticated" });
  } catch (err) { next(err); }
}

export async function changeAdminPassword(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.userId) throw new AppError("Unauthorized", 401);
    await adminService.requireAdmin(req.userId);
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword) throw new AppError("Current password is required", 400);
    if (!newPassword) throw new AppError("New password is required", 400);
    if (newPassword.length < 6) throw new AppError("New password must be at least 6 characters", 400);
    const token = await adminService.changePassword(currentPassword, newPassword, req.userId);
    setAdminCookie(res, token);
    res.json({ success: true, message: "Admin password changed" });
  } catch (err) { next(err); }
}

export async function logoutAdmin(_req: Request, res: Response, next: NextFunction) {
  try {
    clearAdminCookie(res);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function verifyAdminSession(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[ADMIN_AUTH_COOKIE];
    if (!token) return res.json({ authenticated: false });
    const payload = adminService.verifyAdminToken(token);
    if (!payload) { clearAdminCookie(res); return res.json({ authenticated: false }); }
    const user = await adminService.getAdminUser(payload.adminId);
    res.json({ authenticated: true, user });
  } catch (err) { next(err); }
}

// ========== CONTENT MODERATION ==========

export async function getReports(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    const page = parseInt(req.query.page as string) || 1;
    res.json(await adminService.getReports(page));
  } catch (err) { next(err); }
}

export async function resolveReport(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    const { status } = req.body;
    res.json(await adminService.resolveReport(String(req.params.reportId), status, req.userId!));
  } catch (err) { next(err); }
}

export async function getBadWords(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    res.json(await adminService.getBadWords());
  } catch (err) { next(err); }
}

export async function addBadWord(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    const { word } = req.body;
    if (!word) throw new AppError("Word is required", 400);
    res.json(await adminService.addBadWord(word, req.userId!));
  } catch (err) { next(err); }
}

export async function removeBadWord(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    res.json(await adminService.removeBadWord(String(req.params.wordId), req.userId!));
  } catch (err) { next(err); }
}

// ========== NOTIFICATION BROADCASTING ==========

export async function getBroadcasts(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    const page = parseInt(req.query.page as string) || 1;
    res.json(await adminService.getBroadcasts(page));
  } catch (err) { next(err); }
}

export async function createBroadcast(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    const { title, message, type } = req.body;
    if (!title || !message) throw new AppError("Title and message are required", 400);
    res.json(await adminService.createBroadcast(title, message, type || "info", req.userId!));
  } catch (err) { next(err); }
}

export async function deleteBroadcast(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    res.json(await adminService.deleteBroadcast(String(req.params.broadcastId), req.userId!));
  } catch (err) { next(err); }
}

export async function getActiveBroadcasts(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await adminService.getActiveBroadcasts());
  } catch (err) { next(err); }
}

// ========== NAVIGATION BUILDER ==========

export async function getNavItems(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    res.json(await adminService.getNavItems());
  } catch (err) { next(err); }
}

export async function createNavItem(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    res.json(await adminService.createNavItem(req.body, req.userId!));
  } catch (err) { next(err); }
}

export async function updateNavItem(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    res.json(await adminService.updateNavItem(String(req.params.navItemId), req.body, req.userId!));
  } catch (err) { next(err); }
}

export async function deleteNavItem(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    res.json(await adminService.deleteNavItem(String(req.params.navItemId), req.userId!));
  } catch (err) { next(err); }
}

export async function reorderNavItems(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    res.json(await adminService.reorderNavItems(req.body.items));
  } catch (err) { next(err); }
}

// ========== ROLE SYSTEM ==========

export async function getUsersByRole(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    const page = parseInt(req.query.page as string) || 1;
    res.json(await adminService.getUsersByRole(page));
  } catch (err) { next(err); }
}

export async function updateUserRole(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    const { role } = req.body;
    if (!role) throw new AppError("Role is required", 400);
    res.json(await adminService.updateUserRole(String(req.params.userId), role, req.userId!));
  } catch (err) { next(err); }
}

export async function getAvailableRoles(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    res.json(await adminService.getAvailableRoles());
  } catch (err) { next(err); }
}

// ========== PAGE SECTIONS ==========

export async function getPageSections(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    res.json(await pageSectionService.getAll());
  } catch (err) { next(err); }
}

export async function upsertPageSection(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    const slug = String(req.params.slug);
    const { title, content, published } = req.body;
    const section = await pageSectionService.upsert(slug, { title: (title as string), content: (content as string), published: Boolean(published) });
    try { getIO().emit("sections:updated", section); } catch {}
    res.json(section);
  } catch (err) { next(err); }
}

// ========== FILE UPLOAD ==========

export async function uploadAdminFile(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }
    mediaService.validateFile(req.file);
    const folder = (req.body.folder as string) || "wavechat/admin";
    const result = await mediaService.uploadFile(req.file, folder);
    res.json({ url: result.url, publicId: result.publicId });
  } catch (err) { next(err); }
}

// ========== SEED ==========

export async function seedAdminData(req: Request, res: Response, next: NextFunction) {
  try {
    await checkAdmin(req);
    await adminService.seedDefaultFeatures();
    await adminService.seedDefaultSettings();
    res.json({ message: "Admin data seeded" });
  } catch (err) { next(err); }
}
