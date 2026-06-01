import { prisma } from "../config/prisma.js";
import { messageService } from "../services/message.service.js";
import { storyService } from "../services/story.service.js";
import { getIO } from "../socket/index.js";

export interface AppEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

class EventBus {
  private listeners: Map<string, Array<(event: AppEvent) => void>> = new Map();

  on(eventType: string, handler: (event: AppEvent) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(handler);
  }

  emit(eventType: string, payload: Record<string, unknown>) {
    const event: AppEvent = { type: eventType, payload, timestamp: new Date() };
    const handlers = this.listeners.get(eventType) || [];
    handlers.forEach((handler) => {
      try {
        handler(event);
      } catch (err) {
        console.error(`Event handler error [${eventType}]:`, err);
      }
    });
  }

  remove(eventType: string, handler: (event: AppEvent) => void) {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      this.listeners.set(eventType, handlers.filter((h) => h !== handler));
    }
  }
}

export const eventBus = new EventBus();

// Wire up scheduled message delivery
export function setupScheduledMessageHandler() {
  eventBus.on("message:send", async (event) => {
    const { messageId } = event.payload;
    if (!messageId) return;

    try {
      const message = await prisma.message.findUnique({
        where: { id: messageId as string },
        include: {
          sender: { select: { id: true, fullName: true, username: true, avatar: true } },
          replyTo: { select: { id: true, text: true, type: true, sender: { select: { id: true, fullName: true } } } },
          attachments: true,
          reactions: true,
          readReceipts: { select: { userId: true, readAt: true } },
        },
      });

      if (message && !message.isDeleted) {
        try {
          getIO().to(message.conversationId).emit("message:new", message);
        } catch {
          console.warn("Socket not available for scheduled message delivery");
        }
      }
    } catch (err) {
      console.error("Failed to deliver scheduled message:", (err as Error).message);
    }
  });
}

// Scheduled message processor
export async function processScheduledMessages() {
  try {
    const now = new Date();
    const scheduledMessages = await prisma.message.findMany({
      where: {
        scheduledAt: { lte: now },
        isDeleted: false,
      },
    });

    for (const msg of scheduledMessages) {
      eventBus.emit("message:send", {
        messageId: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
      });
    }
  } catch (err) {
    console.warn("Scheduled messages check failed:", (err as Error).message);
  }
}

// Disappearing message cleanup
export async function cleanupDisappearingMessages() {
  try {
    const now = new Date();
    await prisma.message.updateMany({
      where: {
        disappearsAt: { lte: now },
        isDeleted: false,
      },
      data: {
        isDeleted: true,
        text: "",
      },
    });
  } catch (err) {
    console.warn("Disappearing messages cleanup failed:", (err as Error).message);
  }
}

const intervals: ReturnType<typeof setInterval>[] = [];

export function startBackgroundJobs() {
  setupScheduledMessageHandler();
  intervals.push(setInterval(processScheduledMessages, 30000));
  intervals.push(setInterval(cleanupDisappearingMessages, 60000));
  intervals.push(setInterval(() => storyService.cleanupExpired(), 5 * 60 * 1000));
  console.log("Background jobs started");
}

export function stopBackgroundJobs() {
  intervals.forEach(clearInterval);
  intervals.length = 0;
}
