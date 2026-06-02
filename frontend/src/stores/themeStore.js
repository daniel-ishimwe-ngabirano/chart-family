import { create } from "zustand";
import axios from "../lib/axios.js";

export const useThemeStore = create((set, get) => ({
  theme: {},

  loadTheme: async () => {
    try {
      const res = await axios.get("/admin/theme/public");
      const theme = res.data;
      set({ theme });
      applyTheme(theme);
    } catch {
      // use defaults
    }
  },

  getValue: (key, fallback = "") => {
    return get().theme[key] || fallback;
  },
}));

function applyTheme(theme) {
  const root = document.documentElement;

  const accent = theme["accent-color"] || theme["primary-color"];
  if (accent) {
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--accent-hover", accent);
  }

  if (theme["border-radius"]) root.style.setProperty("--radius", theme["border-radius"]);
  if (theme["font"]) root.style.fontFamily = theme["font"];

  if (theme["mode"]) {
    root.setAttribute("data-theme", theme["mode"]);
    try { localStorage.setItem("wavechat_theme", theme["mode"]); } catch {}
  }

  if (theme["bg-color"]) {
    root.style.setProperty("--bg-primary", theme["bg-color"]);
    root.style.setProperty("--bg-chat", theme["bg-color"]);
  }

  if (theme["glass-effect"] === "true") {
    root.setAttribute("data-glass", "true");
  } else {
    root.removeAttribute("data-glass");
  }

  // persist full theme so it survives refresh
  try { localStorage.setItem("wavechat_theme_vars", JSON.stringify(theme)); } catch {}
}

// restore persisted theme immediately (called once on module load)
try {
  const saved = localStorage.getItem("wavechat_theme_vars");
  if (saved) applyTheme(JSON.parse(saved));
} catch {}