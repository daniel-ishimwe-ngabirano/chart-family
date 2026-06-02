import { create } from "zustand";
import axios from "../lib/axios.js";

export const useAuthStore = create((set) => ({
  authUser: null,
  token: null,
  isSigningUp: false,
  isLoggingIn: false,
  isCheckingAuth: true,

  checkAuth: async () => {
    try {
      const res = await axios.get("/auth/me", { timeout: 8000 });
      set({ authUser: res.data.user, token: res.data.accessToken || null });
    } catch {
      set({ authUser: null, token: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axios.post("/auth/signup", data);
      set({ authUser: res.data.user, token: res.data.accessToken });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || "Signup failed" };
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axios.post("/auth/login", data);
      set({ authUser: res.data.user, token: res.data.accessToken });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || "Login failed" };
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axios.post("/auth/logout");
      set({ authUser: null, token: null });
    } catch (error) {
      console.error("Logout error:", error);
    }
  },

  updateProfile: async (data) => {
    try {
      const res = await axios.put("/users/profile", data);
      set({ authUser: res.data });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || "Update failed" };
    }
  },

  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      const res = await axios.post("/users/avatar", formData);
      set({ authUser: res.data });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || "Upload failed" };
    }
  },
}));
