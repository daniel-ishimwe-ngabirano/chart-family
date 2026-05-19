export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

export function generateUsername(fullName: string): string {
  const base = fullName.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}_${suffix}`;
}

export function isValidFileType(mimeType: string): boolean {
  const allowed = [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "video/mp4", "video/webm",
    "audio/mpeg", "audio/ogg", "audio/wav", "audio/webm",
    "application/pdf", "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  return allowed.includes(mimeType);
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
