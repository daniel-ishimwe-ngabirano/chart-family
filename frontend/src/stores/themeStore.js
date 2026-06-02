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
    "glass-effect": "--glass",
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
  // glass effect
  if (theme["glass-effect"] === "true") {
    root.setAttribute("data-glass", "true");
  } else {
    root.removeAttribute("data-glass");
  }
}
