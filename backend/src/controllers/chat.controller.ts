import { Request, Response, NextFunction } from "express";
import { chatService } from "../services/chat.service.js";
import { mediaService } from "../services/media.service.js";
import { messageService } from "../services/message.service.js";
import { getIO } from "../socket/index.js";

export async function getConversations(req: Request, res: Response, next: NextFunction) {
  try {
    const conversations = await chatService.getConversations(req.userId!);
    res.json(conversations);
  } catch (err) { next(err); }
}

export async function getOrCreateConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const conversation = await chatService.getOrCreateConversation(req.userId!, req.params.userId as string);
    res.json(conversation);
  } catch (err) { next(err); }
}

export async function getMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await chatService.getMessages(req.params.conversationId as string, req.userId!, cursor, limit);
    res.json(result);
  } catch (err) { next(err); }
}

export async function searchMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query.q as string;
    if (!query) {
      res.status(400).json({ error: "Search query required" });
      return;
    }
    const messages = await chatService.searchMessages(req.params.conversationId as string, req.userId!, query);
    res.json(messages);
  } catch (err) { next(err); }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    let attachments;

    const files = req.files as Express.Multer.File[] | undefined;
    if (files && files.length > 0) {
      files.forEach((f) => mediaService.validateFile(f));
      const uploads = await mediaService.uploadMultiple(files, "wavechat/messages");
      attachments = uploads;
    }

    const message = await messageService.sendMessage({
      conversationId: req.body.conversationId,
      senderId: req.userId!,
      text: req.body.text,
      type: req.body.type || (attachments ? mediaService.getMessageTypeFromMime(attachments[0].mimeType) : "TEXT"),
      replyToId: req.body.replyToId,
      scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : undefined,
      disappearsAt: req.body.disappearsAt ? new Date(req.body.disappearsAt) : undefined,
      metadata: req.body.metadata,
      attachments,
    });

    try {
      getIO().to(req.body.conversationId).emit("message:new", message);
    } catch {
      console.warn("Socket not available for message broadcast");
    }

    res.status(201).json(message);
  } catch (err) { next(err); }
}

export async function editMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const message = await messageService.editMessage(req.params.messageId as string, req.userId!, req.body.text);
    try { getIO().to(message.conversationId).emit("message:updated", message); } catch {}
    res.json(message);
  } catch (err) { next(err); }
}

export async function deleteMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const deleteForEveryone = req.body.deleteForEveryone || false;
    const message = await messageService.deleteMessage(req.params.messageId as string, req.userId!, deleteForEveryone);
    try { getIO().to(message.conversationId).emit("message:deleted", { messageId: message.id, conversationId: message.conversationId }); } catch {}
    res.json(message);
  } catch (err) { next(err); }
}

export async function reactToMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const message = await messageService.reactToMessage(req.params.messageId as string, req.userId!, req.body.emoji);
    res.json(message);
  } catch (err) { next(err); }
}

export async function forwardMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const message = await messageService.forwardMessage(req.params.messageId as string, req.body.toConversationId, req.userId!);
    res.status(201).json(message);
  } catch (err) { next(err); }
}

export async function pinMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await messageService.pinMessage(req.body.conversationId, req.params.messageId as string, req.userId!);
    res.json(result);
  } catch (err) { next(err); }
}

export async function getPinnedMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const pinned = await messageService.getPinnedMessages(req.params.conversationId as string);
    res.json(pinned);
  } catch (err) { next(err); }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    await chatService.markConversationRead(req.userId!, req.params.conversationId as string);
    res.json({ message: "Marked as read" });
  } catch (err) { next(err); }
}

export async function saveDraft(req: Request, res: Response, next: NextFunction) {
  try {
    const draft = await chatService.saveDraft(req.userId!, req.params.conversationId as string, req.body.text, req.body.metadata);
    res.json(draft);
  } catch (err) { next(err); }
}

export async function getDraft(req: Request, res: Response, next: NextFunction) {
  try {
    const draft = await chatService.getDraft(req.userId!, req.params.conversationId as string);
    res.json(draft || { text: "" });
  } catch (err) { next(err); }
}

export async function deleteDraft(req: Request, res: Response, next: NextFunction) {
  try {
    await chatService.deleteDraft(req.userId!, req.params.conversationId as string);
    res.json({ message: "Draft deleted" });
  } catch (err) { next(err); }
}
