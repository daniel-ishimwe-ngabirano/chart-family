import { create } from "zustand";
import axios from "../lib/axios.js";

export const useStoryStore = create((set, get) => ({
  groups: [],
  loading: false,
  viewingGroup: null,
  viewingIndex: 0,

  fetchStories: async () => {
    set({ loading: true });
    try {
      const res = await axios.get("/stories");
      set({ groups: res.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createStory: async (data) => {
    const res = await axios.post("/stories", data, {
      headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : {},
    });
    await get().fetchStories();
    return res.data;
  },

  deleteStory: async (storyId) => {
    await axios.delete(`/stories/${storyId}`);
    await get().fetchStories();
  },

  viewStory: async (storyId) => {
    await axios.post(`/stories/${storyId}/view`);
    const groups = get().groups.map((g) => ({
      ...g,
      stories: g.stories.map((s) => s.id === storyId ? { ...s, viewed: true } : s),
    }));
    set({ groups });
  },

  openViewer: (groupId, storyIndex = 0) => {
    set({ viewingGroup: groupId, viewingIndex: storyIndex });
  },

  closeViewer: () => {
    set({ viewingGroup: null, viewingIndex: 0 });
  },

  nextStory: () => {
    const { groups, viewingGroup, viewingIndex } = get();
    const group = groups.find((g) => g.user.id === viewingGroup);
    if (!group) return;
    if (viewingIndex < group.stories.length - 1) {
      set({ viewingIndex: viewingIndex + 1 });
    } else {
      const idx = groups.findIndex((g) => g.user.id === viewingGroup);
      if (idx < groups.length - 1) {
        set({ viewingGroup: groups[idx + 1].user.id, viewingIndex: 0 });
      } else {
        get().closeViewer();
      }
    }
  },

  prevStory: () => {
    const { groups, viewingGroup, viewingIndex } = get();
    const group = groups.find((g) => g.user.id === viewingGroup);
    if (!group) return;
    if (viewingIndex > 0) {
      set({ viewingIndex: viewingIndex - 1 });
    } else {
      const idx = groups.findIndex((g) => g.user.id === viewingGroup);
      if (idx > 0) {
        const prev = groups[idx - 1];
        set({ viewingGroup: prev.user.id, viewingIndex: prev.stories.length - 1 });
      }
    }
  },
}));
