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

  // accent / primary color
  const accent = theme["accent-color"] || theme["primary-color"];
  if (accent) {
    root.style.setProperty("--accent", accent);
    // derive hover as slightly lighter
    root.style.setProperty("--accent-hover", accent);
  }

  // border radius
  if (theme["border-radius"]) {
    root.style.setProperty("--radius", theme["border-radius"]);
  }

  // font
  if (theme["font"]) {
    root.style.setProperty("font-family", theme["font"]);
    root.style.fontFamily = theme["font"];
  }

  // theme mode — switch data-theme attribute which controls all bg/text colors
  if (theme["mode"]) {
    root.setAttribute("data-theme", theme["mode"]);
    try { localStorage.setItem("wavechat_theme", theme["mode"]); } catch {}
  }

  // background color override (only if explicitly set)
  if (theme["bg-color"]) {
    root.style.setProperty("--bg-primary", theme["bg-color"]);
    root.style.setProperty("--bg-chat", theme["bg-color"]);
  }

  // glass effect
  if (theme["glass-effect"] === "true") {
    root.setAttribute("data-glass", "true");
  } else {
    root.removeAttribute("data-glass");
  }
}
