import { create } from "zustand";
import axios from "../lib/axios.js";

export const useAdminAuthStore = create((set) => ({
  adminSession: null,
  checking: true,

  checkAdminSession: async () => {
    try {
      const res = await axios.get("/admin/auth/verify");
      if (res.data.authenticated) {
        set({ adminSession: res.data.user, checking: false });
      } else {
        set({ adminSession: null, checking: false });
      }
    } catch {
      set({ adminSession: null, checking: false });
    }
  },

  checkPasswordStatus: async () => {
    try {
      const res = await axios.get("/admin/auth/status");
      return res.data;
    } catch {
      return { hasPassword: false };
    }
  },

  setupPassword: async (password) => {
    try {
      await axios.post("/admin/auth/setup", { password });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || "Setup failed" };
    }
  },

  loginAdmin: async (password) => {
    try {
      await axios.post("/admin/auth/login", { password });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || "Login failed" };
    }
  },

  changeAdminPassword: async (currentPassword, newPassword) => {
    try {
      await axios.put("/admin/auth/change-password", { currentPassword, newPassword });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || "Password change failed" };
    }
  },

  logoutAdmin: async () => {
    try {
      await axios.post("/admin/auth/logout");
      set({ adminSession: null });
    } catch {
      set({ adminSession: null });
    }
  },
}));
