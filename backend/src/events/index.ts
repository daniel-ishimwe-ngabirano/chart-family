import { prisma } from "../config/prisma.js";

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

// Run cleanup every minute (in production, use a job scheduler like Bull)
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

export function startBackgroundJobs() {
  // Check scheduled messages every 30 seconds
  setInterval(processScheduledMessages, 30000);
  // Clean up disappearing messages every minute
  setInterval(cleanupDisappearingMessages, 60000);
  console.log("Background jobs started");
}

export function stopBackgroundJobs() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
