import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { env } from "../config/env.js";

export class AdminService {
  async isAdmin(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return (user as any)?.role === "admin";
  }

  async requireAdmin(userId: string) {
    if (!(await this.isAdmin(userId))) {
      throw new AppError("Admin access required", 403);
    }
  }

  // ========== DASHBOARD STATS ==========

  async getDashboardStats() {
    const [totalUsers, totalConversations, totalMessages, totalCalls, onlineUsers, reportsPending] = await Promise.all([
      prisma.user.count(),
      prisma.conversation.count(),
      prisma.message.count(),
      prisma.call.count(),
      prisma.user.count({ where: { isOnline: true } }),
      prisma.report.count({ where: { status: "pending" } }),
    ]);
    return { totalUsers, totalConversations, totalMessages, totalCalls, onlineUsers, reportsPending };
  }

  async getMessagesPerMinute() {
    const oneMinAgo = new Date(Date.now() - 60000);
    return prisma.message.count({ where: { createdAt: { gte: oneMinAgo } } });
  }

  // ========== USERS ==========

  async getUsers(page = 1, limit = 20, search?: string) {
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
      ];
    }
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: where as any,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: { id: true, fullName: true, email: true, username: true, phone: true, avatar: true, isOnline: true, isVerified: true, createdAt: true, lastSeen: true, role: true },
      }),
      prisma.user.count({ where: where as any }),
    ]);
    return { users, total, page, totalPages: Math.ceil(total / limit) };
  }

  async banUser(userId: string, reason?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found", 404);
    await prisma.user.update({ where: { id: userId }, data: { role: "banned", bio: reason ? `Banned: ${reason}` : "Banned" } as any });
    await prisma.session.deleteMany({ where: { userId } });
    return { message: "User banned" };
  }

  async unbanUser(userId: string) {
    await prisma.user.update({ where: { id: userId }, data: { role: "user", bio: "Hey there! I am using WaveChat" } as any });
    return { message: "User unbanned" };
  }

  async createUser(data: { fullName: string; email: string; password: string; username?: string; role?: string }, adminUserId: string) {
    const existing = await prisma.user.findFirst({ where: { OR: [{ email: data.email }, { username: data.username || "" }] } });
    if (existing) throw new AppError("User with this email or username already exists", 400);
    if (!data.fullName || !data.email || !data.password) throw new AppError("Full name, email, and password are required", 400);
    if (data.password.length < 6) throw new AppError("Password must be at least 6 characters", 400);
    const hash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        password: hash,
        username: data.username || data.email.split("@")[0],
        role: data.role || "user",
      },
    });
    await prisma.adminLog.create({ data: { userId: adminUserId, action: "user.create", resource: `user:${user.id}`, details: `Created user: ${data.email}` } });
    return { id: user.id, fullName: user.fullName, email: user.email, username: user.username, role: user.role };
  }

  async updateUser(userId: string, data: { fullName?: string; email?: string; username?: string; role?: string; avatar?: string; password?: string }, adminUserId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found", 404);
    if (data.email && data.email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing) throw new AppError("Email already in use", 400);
    }
    const updateData = { ...data } as any;
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }
    const updated = await prisma.user.update({ where: { id: userId }, data: updateData, select: { id: true, fullName: true, email: true, username: true, role: true, avatar: true } });
    await prisma.adminLog.create({ data: { userId: adminUserId, action: "user.update", resource: `user:${userId}`, details: `Updated user: ${data.email || userId}` } });
    return updated;
  }

  async deleteUser(userId: string, adminUserId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found", 404);
    if (user.role === "admin") {
      const adminCount = await prisma.user.count({ where: { role: "admin" } });
      if (adminCount <= 1) throw new AppError("Cannot delete the last admin user", 400);
    }
    await prisma.user.delete({ where: { id: userId } });
    await prisma.adminLog.create({ data: { userId: adminUserId, action: "user.delete", resource: `user:${userId}`, details: `Deleted user: ${user.email}` } });
    return { message: "User deleted" };
  }

  async getServerStats() {
    return {
      uptime: Math.floor(process.uptime()),
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      nodeVersion: process.version,
      platform: process.platform,
    };
  }

  async deleteMessage(messageId: string) {
    await prisma.message.update({ where: { id: messageId }, data: { isDeleted: true, text: "" } });
    return { message: "Message deleted by admin" };
  }

  // ========== FEATURE FLAGS ==========

  async getFeatures() {
    return prisma.featureFlag.findMany({ orderBy: { category: "asc" } });
  }

  async toggleFeature(name: string, enabled: boolean, adminUserId: string) {
    const flag = await prisma.featureFlag.findUnique({ where: { name } });
    if (!flag) throw new AppError(`Feature "${name}" not found`, 404);
    const updated = await prisma.featureFlag.update({ where: { name }, data: { enabled } });
    await prisma.adminLog.create({ data: { userId: adminUserId, action: enabled ? "feature.enable" : "feature.disable", resource: `feature:${name}`, details: JSON.stringify({ name, enabled }) } });
    return updated;
  }

  async getPublicFeatures() {
    return prisma.featureFlag.findMany({ where: { enabled: true }, select: { name: true, enabled: true } });
  }

  async seedDefaultFeatures() {
    const count = await prisma.featureFlag.count();
    if (count > 0) return;
    const defaults = [
      { name: "chat_enabled", label: "Chat", description: "Enable chat messaging", enabled: true, category: "core" },
      { name: "groups_enabled", label: "Groups", description: "Enable group conversations", enabled: true, category: "core" },
      { name: "voice_calls", label: "Voice Calls", description: "Enable voice calls", enabled: true, category: "communication" },
      { name: "video_calls", label: "Video Calls", description: "Enable video calls", enabled: true, category: "communication" },
      { name: "stories_enabled", label: "Stories", description: "Enable story sharing", enabled: false, category: "social" },
      { name: "ai_assistant", label: "AI Assistant", description: "Enable AI chat assistant", enabled: false, category: "ai" },
      { name: "file_sharing", label: "File Sharing", description: "Enable file attachments", enabled: true, category: "core" },
      { name: "emoji_reactions", label: "Reactions", description: "Enable emoji reactions on messages", enabled: true, category: "chat" },
      { name: "message_editing", label: "Edit Messages", description: "Allow editing sent messages", enabled: true, category: "chat" },
      { name: "message_deletion", label: "Delete Messages", description: "Allow deleting messages", enabled: true, category: "chat" },
      { name: "polls_enabled", label: "Polls", description: "Enable polls in groups", enabled: true, category: "social" },
      { name: "notifications_enabled", label: "Notifications", description: "Enable push notifications", enabled: true, category: "core" },
      { name: "registration_enabled", label: "User Registration", description: "Allow new user signups", enabled: true, category: "system" },
      { name: "admin_panel", label: "Admin Panel", description: "Enable admin dashboard access", enabled: true, category: "system" },
    ];
    await prisma.featureFlag.createMany({ data: defaults });
  }

  // ========== SETTINGS ==========

  async getSettings(group?: string) {
    const where = group ? { group } : {};
    return prisma.setting.findMany({ where, orderBy: { key: "asc" } });
  }

  async getEditableSettings(group?: string) {
    const where = group ? { group, NOT: { key: "admin_password_hash" } } : { NOT: { key: "admin_password_hash" } };
    return prisma.setting.findMany({ where, orderBy: { key: "asc" } });
  }

  async updateSettings(settings: Array<{ key: string; value: string }>, adminUserId: string) {
    const results = [];
    const filtered = settings.filter((s) => s.key !== "admin_password_hash");
    for (const s of filtered) {
      const updated = await prisma.setting.upsert({
        where: { key: s.key },
        create: { key: s.key, value: s.value },
        update: { value: s.value },
      });
      results.push(updated);
    }
    await prisma.adminLog.create({ data: { userId: adminUserId, action: "settings.update", resource: "settings", details: JSON.stringify(filtered.map((s) => s.key)) } });
    return results;
  }

  async seedDefaultSettings() {
    const count = await prisma.setting.count();
    if (count > 0) return;
    const defaults = [
      // General
      { key: "site_name", value: "WaveChat", type: "string", group: "general", label: "Site Name" },
      { key: "site_description", value: "Fast, secure, real-time messaging.", type: "string", group: "general", label: "Site Description" },
      { key: "maintenance_mode", value: "false", type: "boolean", group: "system", label: "Maintenance Mode" },
      // Limits
      { key: "max_upload_size", value: "50", type: "number", group: "limits", label: "Max Upload Size (MB)" },
      { key: "max_group_members", value: "200", type: "number", group: "limits", label: "Max Group Members" },
      // Branding
      { key: "logo_url", value: "", type: "string", group: "branding", label: "Logo URL" },
      { key: "favicon_url", value: "", type: "string", group: "branding", label: "Favicon URL" },
      { key: "default_avatar", value: "", type: "string", group: "branding", label: "Default Avatar URL" },
      // Theme
      { key: "theme_primary_color", value: "#7c3aed", type: "string", group: "theme", label: "Primary Color" },
      { key: "theme_accent_color", value: "#00a884", type: "string", group: "theme", label: "Accent Color" },
      { key: "theme_bg_color", value: "#111b21", type: "string", group: "theme", label: "Background Color" },
      { key: "theme_border_radius", value: "8px", type: "string", group: "theme", label: "Border Radius" },
      { key: "theme_font", value: "'Segoe UI', system-ui, sans-serif", type: "string", group: "theme", label: "Font Family" },
      { key: "theme_sidebar_style", value: "solid", type: "string", group: "theme", label: "Sidebar Style (solid/glass/minimal)" },
      { key: "theme_chat_bubble_style", value: "rounded", type: "string", group: "theme", label: "Chat Bubble Style (rounded/square/modern)" },
      { key: "theme_animation", value: "all", type: "string", group: "theme", label: "Animations (all/minimal/none)" },
      { key: "theme_mode", value: "dark", type: "string", group: "theme", label: "Theme Mode (dark/light)" },
    ];
    await prisma.setting.createMany({ data: defaults });
  }

  // ========== ADMIN LOGS ==========

  async getLogs(page = 1, limit = 50) {
    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit, include: { user: { select: { id: true, fullName: true, avatar: true } } } }),
      prisma.adminLog.count(),
    ]);
    return { logs, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ========== ADMIN AUTH ==========

  _generatePassword(length = 20): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*";
    let pwd = "";
    for (let i = 0; i < length; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    return pwd;
  }

  async checkPasswordStatus(): Promise<{ hasPassword: boolean; fromEnv?: boolean }> {
    const envPassword = process.env.ADMIN_PANEL_SECRET;

    if (envPassword) {
      const hash = await bcrypt.hash(envPassword, 12);
      await prisma.setting.upsert({
        where: { key: "admin_password_hash" },
        create: { key: "admin_password_hash", value: hash, type: "string", group: "system", label: "Admin Password Hash" },
        update: { value: hash, updatedAt: new Date() },
      });
      return { hasPassword: true, fromEnv: true };
    }

    const setting = await prisma.setting.findUnique({ where: { key: "admin_password_hash" } });
    if (!setting || !setting.value) {
      return { hasPassword: false };
    }

    return { hasPassword: true };
  }

  async setupPassword(password: string, adminUserId: string): Promise<string> {
    const exists = await prisma.setting.findUnique({ where: { key: "admin_password_hash" } });
    if (exists?.value) throw new AppError("Admin password already set", 400);
    if (password.length < 6) throw new AppError("Password must be at least 6 characters", 400);
    const hash = await bcrypt.hash(password, 12);
    await prisma.setting.upsert({ where: { key: "admin_password_hash" }, create: { key: "admin_password_hash", value: hash, type: "string", group: "system", label: "Admin Password Hash" }, update: { value: hash } });
    await prisma.adminLog.create({ data: { userId: adminUserId, action: "admin.password.setup", resource: "admin", details: "Admin password created" } });
    return jwt.sign({ adminId: adminUserId, type: "admin" }, env.ADMIN_JWT_SECRET, { expiresIn: "24h" });
  }

  async loginPassword(password: string, adminUserId: string): Promise<string> {
    const setting = await prisma.setting.findUnique({ where: { key: "admin_password_hash" } });
    if (!setting) throw new AppError("No admin password set. Set up admin password first.", 400);
    const valid = await bcrypt.compare(password, setting.value);
    if (!valid) throw new AppError("Invalid admin password", 401);
    return jwt.sign({ adminId: adminUserId, type: "admin" }, env.ADMIN_JWT_SECRET, { expiresIn: "24h" });
  }

  async changePassword(oldPassword: string, newPassword: string, adminUserId: string): Promise<string> {
    await this.loginPassword(oldPassword, adminUserId);
    if (newPassword.length < 6) throw new AppError("Password must be at least 6 characters", 400);
    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.setting.upsert({ where: { key: "admin_password_hash" }, create: { key: "admin_password_hash", value: hash, type: "string", group: "system", label: "Admin Password Hash" }, update: { value: hash } });
    await prisma.adminLog.create({ data: { userId: adminUserId, action: "admin.password.change", resource: "admin", details: "Admin password changed" } });
    return jwt.sign({ adminId: adminUserId, type: "admin" }, env.ADMIN_JWT_SECRET, { expiresIn: "24h" });
  }

  verifyAdminToken(token: string): { adminId: string } | null {
    try { return jwt.verify(token, env.ADMIN_JWT_SECRET) as { adminId: string }; } catch { return null; }
  }

  async getAdminUser(userId: string) {
    return prisma.user.findUnique({ where: { id: userId }, select: { id: true, fullName: true, email: true, avatar: true, role: true } });
  }

  // ========== THEME ==========

  async getTheme() {
    const settings = await prisma.setting.findMany({ where: { group: "theme" } });
    const theme: Record<string, string> = {};
    settings.forEach((s) => { theme[s.key.replace("theme_", "")] = s.value; });
    return theme;
  }

  // ========== CONTENT MODERATION ==========

  async getReports(page = 1, limit = 20) {
    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          reporter: { select: { id: true, fullName: true, avatar: true } },
          reported: { select: { id: true, fullName: true, avatar: true, role: true } },
        },
      }),
      prisma.report.count(),
    ]);
    return { reports, total, page, totalPages: Math.ceil(total / limit) };
  }

  async resolveReport(reportId: string, status: string, adminUserId: string) {
    const validStatuses = ["resolved", "dismissed", "action_taken"];
    if (!validStatuses.includes(status)) throw new AppError("Invalid status", 400);
    const updated = await prisma.report.update({
      where: { id: reportId },
      data: { status, handledById: adminUserId, handledAt: new Date() },
    });
    if (status === "action_taken") {
      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (report?.reportedId) {
        await prisma.user.update({ where: { id: report.reportedId }, data: { role: "banned" } });
      }
    }
    await prisma.adminLog.create({ data: { userId: adminUserId, action: `report.${status}`, resource: `report:${reportId}`, details: `Report ${reportId} marked as ${status}` } });
    return updated;
  }

  async getBadWords() {
    return prisma.badWord.findMany({ orderBy: { word: "asc" } });
  }

  async addBadWord(word: string, adminUserId: string) {
    const exists = await prisma.badWord.findUnique({ where: { word: word.toLowerCase() } });
    if (exists) throw new AppError("Word already in list", 400);
    const added = await prisma.badWord.create({ data: { word: word.toLowerCase() } });
    await prisma.adminLog.create({ data: { userId: adminUserId, action: "badword.add", resource: `badword:${word}`, details: `Added bad word: ${word}` } });
    return added;
  }

  async removeBadWord(wordId: string, adminUserId: string) {
    const w = await prisma.badWord.findUnique({ where: { id: wordId } });
    if (!w) throw new AppError("Word not found", 404);
    await prisma.badWord.delete({ where: { id: wordId } });
    await prisma.adminLog.create({ data: { userId: adminUserId, action: "badword.remove", resource: `badword:${w.word}`, details: `Removed bad word: ${w.word}` } });
    return { message: "Word removed" };
  }

  async checkTextForBadWords(text: string): Promise<boolean> {
    const words = await prisma.badWord.findMany({ select: { word: true } });
    return words.some((w) => text.toLowerCase().includes(w.word));
  }

  // ========== NOTIFICATION BROADCASTING ==========

  async getBroadcasts(page = 1, limit = 20) {
    const [broadcasts, total] = await Promise.all([
      prisma.broadcast.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { reads: true } } },
      }),
      prisma.broadcast.count(),
    ]);
    return { broadcasts, total, page, totalPages: Math.ceil(total / limit) };
  }

  async createBroadcast(title: string, message: string, type: string, adminUserId: string) {
    const broadcast = await prisma.broadcast.create({
      data: { title, message, type, createdBy: adminUserId },
    });
    await prisma.adminLog.create({ data: { userId: adminUserId, action: "broadcast.create", resource: `broadcast:${broadcast.id}`, details: `Created broadcast: ${title}` } });
    return broadcast;
  }

  async deleteBroadcast(broadcastId: string, adminUserId: string) {
    await prisma.broadcast.delete({ where: { id: broadcastId } });
    await prisma.adminLog.create({ data: { userId: adminUserId, action: "broadcast.delete", resource: `broadcast:${broadcastId}`, details: "Deleted broadcast" } });
    return { message: "Broadcast deleted" };
  }

  async getActiveBroadcasts() {
    return prisma.broadcast.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { reads: true } } },
    });
  }

  // ========== NAVIGATION BUILDER ==========

  async getNavItems() {
    return prisma.navItem.findMany({
      orderBy: { position: "asc" },
      include: { children: { orderBy: { position: "asc" } } },
    });
  }

  async createNavItem(data: { label: string; icon?: string; path: string; parentId?: string; position?: number; role?: string }, adminUserId: string) {
    const maxPosItem = await prisma.navItem.findFirst({ orderBy: { position: "desc" }, select: { position: true } });
    const maxPos = maxPosItem?.position ?? -1;
    const item = await prisma.navItem.create({
      data: { label: data.label, icon: data.icon, path: data.path, parentId: data.parentId, position: data.position ?? maxPos + 1, role: data.role },
    });
    await prisma.adminLog.create({ data: { userId: adminUserId, action: "nav.create", resource: `nav:${item.id}`, details: `Created nav item: ${data.label}` } });
    return item;
  }

  async updateNavItem(id: string, data: Partial<{ label: string; icon: string; path: string; parentId: string; position: number; isVisible: boolean; role: string }>, adminUserId: string) {
    const item = await prisma.navItem.update({ where: { id }, data });
    await prisma.adminLog.create({ data: { userId: adminUserId, action: "nav.update", resource: `nav:${id}`, details: `Updated nav item: ${data.label || id}` } });
    return item;
  }

  async deleteNavItem(id: string, adminUserId: string) {
    await prisma.navItem.delete({ where: { id } });
    await prisma.adminLog.create({ data: { userId: adminUserId, action: "nav.delete", resource: `nav:${id}`, details: "Deleted nav item" } });
    return { message: "Nav item deleted" };
  }

  async reorderNavItems(items: Array<{ id: string; position: number }>) {
    for (const item of items) {
      await prisma.navItem.update({ where: { id: item.id }, data: { position: item.position } });
    }
    return { message: "Reordered" };
  }

  // ========== ROLE SYSTEM ==========

  async getUsersByRole(page = 1, limit = 50) {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: { id: true, fullName: true, email: true, avatar: true, role: true, createdAt: true },
      }),
      prisma.user.count(),
    ]);
    const roles = [...new Set(users.map((u) => u.role))];
    return { users, roles, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateUserRole(userId: string, role: string, adminUserId: string) {
    if (!["user", "admin", "moderator", "manager", "support", "banned"].includes(role)) {
      throw new AppError("Invalid role", 400);
    }
    const updated = await prisma.user.update({ where: { id: userId }, data: { role } });
    await prisma.adminLog.create({ data: { userId: adminUserId, action: "user.role.change", resource: `user:${userId}`, details: `Changed role to ${role}` } });
    return updated;
  }

  async seedDefaultAdmin(email: string, password: string) {
    const existing = await prisma.user.findFirst({ where: { role: "admin" } });
    if (existing) {
      console.log(`  ℹ️  Admin already exists: ${existing.email}`);
      return;
    }
    const hash = await bcrypt.hash(password, 12);
    const ts = Date.now();
    try {
      await prisma.user.create({
        data: { email, password: hash, fullName: "Super Admin", username: `admin_${ts}`, role: "admin", isVerified: true },
      });
      console.log(`\n  ✅ Default admin created: ${email} / ${password}\n`);
    } catch (err) {
      console.error("  ❌ Failed to create admin:", (err as Error).message);
    }
  }

  async getAvailableRoles() {
    return [
      { id: "user", label: "User", permissions: ["read_messages", "send_messages", "upload_files"] },
      { id: "support", label: "Support", permissions: ["read_messages", "send_messages", "upload_files", "view_reports", "mute_users"] },
      { id: "moderator", label: "Moderator", permissions: ["read_messages", "send_messages", "upload_files", "view_reports", "delete_messages", "mute_users", "ban_users"] },
      { id: "manager", label: "Manager", permissions: ["read_messages", "send_messages", "upload_files", "view_reports", "delete_messages", "mute_users", "ban_users", "manage_roles", "view_analytics"] },
      { id: "admin", label: "Admin", permissions: ["*"] },
    ];
  }
}

export const adminService = new AdminService();
