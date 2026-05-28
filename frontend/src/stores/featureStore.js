import { create } from "zustand";
import axios from "../lib/axios.js";

export const useFeatureStore = create((set, get) => ({
  features: [],
  loading: false,
  error: null,

  fetchFeatures: async () => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get("/admin/features");
      set({ features: res.data });
    } catch (error) {
      console.error("Failed to fetch features:", error.response?.data?.error || error.message);
      set({ error: "Failed to load features" });
    } finally {
      set({ loading: false });
    }
  },

  fetchPublicFeatures: async () => {
    try {
      const res = await axios.get("/admin/features/public");
      set({ features: res.data });
    } catch (error) {
      console.error("Failed to fetch public features:", error.response?.data?.error || error.message);
    }
  },

  toggleFeature: async (name, enabled) => {
    const prev = get().features.find((f) => f.name === name);
    set((state) => ({
      features: state.features.map((f) => (f.name === name ? { ...f, enabled } : f)),
    }));
    try {
      const res = await axios.put(`/admin/features/${name}`, { enabled });
      set((state) => ({
        features: state.features.map((f) => (f.name === name ? res.data : f)),
      }));
      return { success: true };
    } catch (error) {
      if (prev) {
        set((state) => ({
          features: state.features.map((f) => (f.name === name ? prev : f)),
        }));
      }
      return { success: false, error: error.response?.data?.error || "Failed to toggle" };
    }
  },

  isEnabled: (name) => {
    const { features } = get();
    const flag = features.find((f) => f.name === name);
    return flag ? flag.enabled : false;
  },

  applyFeatureUpdate: (feature) => {
    set((state) => {
      const idx = state.features.findIndex((f) => f.name === feature.name);
      if (idx >= 0) {
        const updated = [...state.features];
        updated[idx] = feature;
        return { features: updated };
      }
      return { features: [...state.features, feature] };
    });
  },
}));
