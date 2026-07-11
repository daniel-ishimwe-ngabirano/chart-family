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
      const storedToken = localStorage.getItem("wavechat_token");
      if (storedToken) {
        set({ token: storedToken });
      }
      const res = await axios.get("/auth/me", { timeout: 8000 });
      set({ authUser: res.data.user, token: res.data.accessToken || storedToken || null });
      if (res.data.accessToken) {
        localStorage.setItem("wavechat_token", res.data.accessToken);
      }
    } catch {
      set({ authUser: null, token: null });
      localStorage.removeItem("wavechat_token");
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axios.post("/auth/signup", data);
      localStorage.setItem("wavechat_token", res.data.accessToken);
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
      localStorage.setItem("wavechat_token", res.data.accessToken);
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
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=; expires=" + new Date(0).toUTCString() + "; path=/");
      });
    } catch {}
    try { 
      await axios.post("/auth/logout"); 
    } catch {}
    try {
      localStorage.removeItem("wavechat_token");
    } catch {}
    set({ authUser: null, token: null });
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
