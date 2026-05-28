import { create } from "zustand";
import axios from "../lib/axios.js";

export const useSettingsStore = create((set, get) => ({
  settings: [],
  loading: false,
  error: null,

  fetchSettings: async (group) => {
    set({ loading: true, error: null });
    try {
      const params = group ? { group } : {};
      const res = await axios.get("/admin/settings", { params });
      set({ settings: res.data });
    } catch (error) {
      console.error("Failed to fetch settings:", error.response?.data?.error || error.message);
      set({ error: "Failed to load settings" });
    } finally {
      set({ loading: false });
    }
  },

  updateSettings: async (settings) => {
    try {
      await axios.put("/admin/settings", { settings });
      set((state) => {
        const updated = [...state.settings];
        for (const s of settings) {
          const idx = updated.findIndex((u) => u.key === s.key);
          if (idx >= 0) updated[idx] = { ...updated[idx], value: s.value };
        }
        return { settings: updated };
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || "Failed to update" };
    }
  },

  getValue: (key, defaultValue = "") => {
    const { settings } = get();
    const s = settings.find((s) => s.key === key);
    return s ? s.value : defaultValue;
  },

  applySettingsUpdate: (updatedSettings) => {
    set((state) => {
      const next = [...state.settings];
      for (const s of updatedSettings) {
        const idx = next.findIndex((u) => u.key === s.key);
        if (idx >= 0) next[idx] = { ...next[idx], value: s.value };
        else next.push(s);
      }
      return { settings: next };
    });
  },
}));
