import { create } from "zustand";

function getInitialTheme() {
  try {
    const stored = localStorage.getItem("wavechat_theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {}
  return "dark";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem("wavechat_theme", theme); } catch {}
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
