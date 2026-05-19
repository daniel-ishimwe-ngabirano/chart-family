import { create } from "zustand";
import axios from "../lib/axios.js";

export const usePageSectionStore = create((set, get) => ({
  sections: [],
  loading: false,

  fetchSections: async () => {
    set({ loading: true });
    try {
      const res = await axios.get("/admin/page-sections");
      set({ sections: res.data });
    } catch {
      // silently fail
    } finally {
      set({ loading: false });
    }
  },

  upsertSection: async (slug, data) => {
    try {
      const res = await axios.put(`/admin/page-sections/${slug}`, data);
      set((state) => {
        const idx = state.sections.findIndex((s) => s.slug === slug);
        const updated = [...state.sections];
        if (idx >= 0) updated[idx] = res.data;
        else updated.push(res.data);
        return { sections: updated };
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || "Failed to save" };
    }
  },

  getSection: (slug) => {
    return get().sections.find((s) => s.slug === slug);
  },
}));
