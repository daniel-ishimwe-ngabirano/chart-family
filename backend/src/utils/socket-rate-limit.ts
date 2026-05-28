const eventCounts = new Map<string, Map<string, { count: number; resetAt: number }>>();

export function rateLimitSocket(
  key: string,
  event: string,
  maxEvents: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  let userEvents = eventCounts.get(key);
  if (!userEvents) {
    userEvents = new Map();
    eventCounts.set(key, userEvents);
  }
  let record = userEvents.get(event);
  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + windowMs };
    userEvents.set(event, record);
  }
  record.count++;
  return record.count <= maxEvents;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, events] of eventCounts) {
    for (const [event, record] of events) {
      if (now > record.resetAt) {
        events.delete(event);
      }
    }
    if (events.size === 0) {
      eventCounts.delete(key);
    }
  }
}, 60_000);
