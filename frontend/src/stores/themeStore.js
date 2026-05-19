import { create } from "zustand";
import axios from "../lib/axios.js";

export const useThemeStore = create((set, get) => ({
  theme: {},

  loadTheme: async () => {
    try {
      const res = await axios.get("/admin/settings?group=theme");
      const theme = {};
      res.data.forEach((s) => {
        const key = s.key.replace("theme_", "").replace(/_/g, "-");
        theme[key] = s.value;
      });
      set({ theme });
      applyTheme(theme);
    } catch {
      // not an admin user - use defaults
    }
  },

  getValue: (key, fallback = "") => {
    return get().theme[key] || fallback;
  },
}));

function applyTheme(theme) {
  const root = document.documentElement;
  const map = {
    "primary-color": "--accent",
    "accent-color": "--accent",
    "bg-color": "--bg-primary",
    "border-radius": "--radius",
    "font": "--font-family",
    "sidebar-style": "--sidebar-style",
    "chat-bubble-style": "--chat-bubble-style",
    "animation": "--animation",
    "mode": "--mode",
  };

  for (const [key, cssVar] of Object.entries(map)) {
    if (theme[key]) {
      root.style.setProperty(cssVar, theme[key]);
    }
  }
  // background
  if (theme["bg-color"]) {
    root.style.setProperty("--bg-primary", theme["bg-color"]);
  }
  if (theme["primary-color"] && !theme["accent-color"]) {
    root.style.setProperty("--accent", theme["primary-color"]);
  }
}
