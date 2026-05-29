import { Request, Response, NextFunction } from "express";
import { storyService } from "../services/story.service.js";

export async function createStory(req: Request, res: Response, next: NextFunction) {
  try {
    const { caption, type, backgroundColor, fontStyle, textColor } = req.body;
    const story = await storyService.createStory(req.userId!, {
      media: req.file || undefined,
      caption,
      type: type || (req.file ? "IMAGE" : "TEXT"),
      backgroundColor,
      fontStyle,
      textColor,
    });
    res.status(201).json(story);
  } catch (err) { next(err); }
}

export async function getStories(req: Request, res: Response, next: NextFunction) {
  try {
    const grouped = await storyService.getStories(req.userId!);
    res.json(grouped);
  } catch (err) { next(err); }
}

export async function deleteStory(req: Request, res: Response, next: NextFunction) {
  try {
    await storyService.deleteStory(req.params.id as string, req.userId!);
    res.json({ message: "Story deleted" });
  } catch (err) { next(err); }
}

export async function viewStory(req: Request, res: Response, next: NextFunction) {
  try {
    await storyService.viewStory(req.params.id as string, req.userId!);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function getStoryViews(req: Request, res: Response, next: NextFunction) {
  try {
    const views = await storyService.getStoryViews(req.params.id as string, req.userId!);
    res.json(views);
  } catch (err) { next(err); }
}
