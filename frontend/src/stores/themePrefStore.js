import { create } from "zustand";
import { STORAGE_KEYS, DEFAULT_SETTINGS } from "../lib/constants.js";

function getInitialTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.THEME);
    if (stored === "light" || stored === "dark") return stored;
  } catch {}
  return DEFAULT_SETTINGS.THEME;
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem(STORAGE_KEYS.THEME, theme); } catch {}
}

export const useThemePrefStore = create((set, get) => ({
  theme: getInitialTheme(),

  init: () => {
    const { theme } = get();
    applyTheme(theme);
  },

  toggleTheme: () => {
    const newTheme = get().theme === "dark" ? "light" : "dark";
    applyTheme(newTheme);
    set({ theme: newTheme });
  },

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
}));
