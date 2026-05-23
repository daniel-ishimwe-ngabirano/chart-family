import { create } from "zustand";
import axios from "../lib/axios.js";

export const useChatStore = create((set, get) => ({
  conversations: [],
  selectedConversation: null,
  messages: [],
  isMessagesLoading: false,
  users: [],
  onlineUsers: new Set(),

  setOnlineUsers: (users) => {
    if (typeof users === "function") {
      const prev = get().onlineUsers;
      set({ onlineUsers: new Set(users(prev)) });
    } else {
      set({ onlineUsers: new Set(users) });
    }
  },

  getUsers: async () => {
    try {
      const res = await axios.get("/users");
      set({ users: res.data });
      const online = new Set(get().onlineUsers);
      res.data.forEach((u) => { if (u.isOnline) online.add(u.id); });
      set({ onlineUsers: online });
    } catch (error) {
      console.error("GetUsers error:", error);
    }
  },

  getConversations: async () => {
    try {
      const res = await axios.get("/conversations");
      set({ conversations: res.data });
      const online = new Set(get().onlineUsers);
      res.data.forEach((c) => {
        c.members?.forEach((m) => { if (m.user?.isOnline) online.add(m.user.id); });
      });
      set({ onlineUsers: online });
    } catch (error) {
      console.error("GetConversations error:", error);
    }
  },

  getOrCreateConversation: async (targetUserId) => {
    try {
      const res = await axios.get(`/conversations/${targetUserId}`);
      set({ selectedConversation: res.data });
      const online = new Set(get().onlineUsers);
      res.data.members?.forEach((m) => { if (m.user?.isOnline) online.add(m.user.id); });
      set({ onlineUsers: online });
      return res.data;
    } catch (error) {
      console.error("GetOrCreateConversation error:", error);
    }
  },

  getMessages: async (conversationId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axios.get(`/conversations/${conversationId}/messages`);
      set({ messages: res.data.messages || res.data });
    } catch (error) {
      console.error("GetMessages error:", error);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (data) => {
    try {
      const convId = data instanceof FormData ? data.get("conversationId") : data.conversationId;
      const res = await axios.post(`/conversations/${convId}/messages`, data);
      set((state) => ({ messages: [...state.messages, res.data] }));
      return res.data;
    } catch (error) {
      console.error("SendMessage error:", error);
    }
  },

  deleteMessage: async (messageId, deleteForEveryone = false) => {
    try {
      await axios.delete(`/conversations/messages/${messageId}`, {
        data: { deleteForEveryone },
      });
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === messageId ? { ...m, text: "", isDeleted: true } : m
        ),
      }));
    } catch (error) {
      console.error("DeleteMessage error:", error);
    }
  },

  editMessage: async (messageId, text) => {
    try {
      const res = await axios.put(`/conversations/messages/${messageId}`, { text });
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === messageId ? res.data : m
        ),
      }));
    } catch (error) {
      console.error("EditMessage error:", error);
    }
  },

  reactToMessage: async (messageId, emoji) => {
    try {
      const res = await axios.post(`/conversations/messages/${messageId}/react`, { emoji });
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === messageId ? { ...m, reactions: res.data.reactions } : m
        ),
      }));
    } catch (error) {
      console.error("ReactToMessage error:", error);
    }
  },

  addMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }));
  },

  updateMessage: (message) => {
    set((state) => ({
      messages: state.messages.map((m) => m.id === message.id ? message : m),
    }));
  },

  removeMessage: (messageId) => {
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
    }));
  },

  markMessageRead: (messageId, userId) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId
          ? { ...m, readBy: [...new Set([...(m.readBy || []), userId])] }
          : m
      ),
    }));
  },

  updateMessageReaction: (messageId, reactions) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, reactions } : m
      ),
    }));
  },

  setSelectedConversation: (conversation) => set({ selectedConversation: conversation }),
  setMessages: (messages) => set({ messages }),

  typingUsers: {},
  addTypingUser: (conversationId, { userId, fullName }) =>
    set((state) => {
      const current = state.typingUsers[conversationId];
      if (!current) return { typingUsers: { ...state.typingUsers, [conversationId]: [{ userId, fullName }] } };
      if (current.some((u) => u.userId === userId)) return state;
      return { typingUsers: { ...state.typingUsers, [conversationId]: [...current, { userId, fullName }] } };
    }),
  removeTypingUser: (conversationId, userId) =>
    set((state) => {
      const current = state.typingUsers[conversationId];
      if (!current) return state;
      const filtered = current.filter((u) => u.userId !== userId);
      if (filtered.length === 0) {
        const next = { ...state.typingUsers };
        delete next[conversationId];
        return { typingUsers: next };
      }
      return { typingUsers: { ...state.typingUsers, [conversationId]: filtered } };
    }),
}));
