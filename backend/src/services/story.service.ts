import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { mediaService } from "./media.service.js";
import { getIO } from "../socket/index.js";

export class StoryService {
  async createStory(userId: string, data: { media?: Express.Multer.File; caption?: string; type: string; backgroundColor?: string; fontStyle?: string; textColor?: string }) {
    let media: string | undefined;
    if (data.media) {
      mediaService.validateFile(data.media);
      const result = await mediaService.uploadFile(data.media, "wavechat/stories");
      media = result.url;
    }

    const story = await prisma.story.create({
      data: {
        userId,
        media: media || null,
        caption: data.caption || null,
        type: data.type,
        backgroundColor: data.backgroundColor || "#000000",
        fontStyle: data.fontStyle || "sans-serif",
        textColor: data.textColor || "#FFFFFF",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      include: { user: { select: { id: true, fullName: true, avatar: true } } },
    });

    try { getIO().emit("story:new", { userId }); } catch {}

    return story;
  }

  async getStories(userId: string) {
    const stories = await prisma.story.findMany({
      include: {
        user: { select: { id: true, fullName: true, avatar: true } },
        views: { select: { viewerId: true, viewedAt: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const grouped = new Map<string, { user: { id: string; fullName: string; avatar: string | null }; stories: any[] }>();
    for (const story of stories) {
      const key = story.userId;
      if (!grouped.has(key)) {
        grouped.set(key, { user: story.user as any, stories: [] });
      }
      grouped.get(key)!.stories.push({
        ...story,
        viewed: false,
        views: undefined,
      });
    }

    return Array.from(grouped.values());
  }

  async deleteStory(storyId: string, userId: string) {
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw new AppError("Story not found", 404);
    if (story.userId !== userId) throw new AppError("Not authorized", 403);

    await prisma.story.delete({ where: { id: storyId } });
  }

  async viewStory(storyId: string, viewerId: string) {
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw new AppError("Story not found", 404);

    await prisma.storyView.upsert({
      where: { storyId_viewerId: { storyId, viewerId } },
      create: { storyId, viewerId },
      update: {},
    });
  }

  async getStoryViews(storyId: string, userId: string) {
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw new AppError("Story not found", 404);
    if (story.userId !== userId) throw new AppError("Not authorized", 403);

    return prisma.storyView.findMany({
      where: { storyId },
      include: { viewer: { select: { id: true, fullName: true, avatar: true } } },
      orderBy: { viewedAt: "desc" },
    });
  }

  async cleanupExpired() {
    await prisma.story.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  }
}

export const storyService = new StoryService();
