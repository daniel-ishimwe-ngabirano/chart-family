const COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
  "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
  "#F0B27A", "#82E0AA", "#F1948A", "#85929E", "#73C6B6",
  "#E59866", "#A9CCE3", "#D7BDE2", "#A3E4D7", "#FAD7A0",
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function generateAvatarSvg(name, size = 80) {
  const initials = getInitials(name);
  const colorIndex = hashString(name || "default") % COLORS.length;
  const bg = COLORS[colorIndex];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${bg}" rx="${size * 0.2}" />
    <text x="50%" y="50%" text-anchor="middle" dy="0.35em" fill="white" font-size="${size * 0.4}" font-family="system-ui, sans-serif" font-weight="600">${initials}</text>
  </svg>`;
}

export function avatarDataUri(name, size = 80) {
  const svg = generateAvatarSvg(name, size);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function handleAvatarError(e, name) {
  if (!e.target.dataset.fallbackSet) {
    e.target.dataset.fallbackSet = "1";
    e.target.src = avatarDataUri(name, e.target.width || 80);
  }
}
