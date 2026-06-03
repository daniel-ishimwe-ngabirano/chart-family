import { create } from "zustand";
import axios from "../lib/axios.js";

export const useChatStore = create((set, get) => ({
  conversations: [],
  selectedConversation: null,
  messages: [],
  isMessagesLoading: false,
  isLoadingMore: false,
  nextCursor: null,
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

  getMessages: async (conversationId, cursor) => {
    const isInitial = !cursor;
    if (isInitial) set({ isMessagesLoading: true });
    else set({ isLoadingMore: true });
    try {
      const params = cursor ? `?cursor=${cursor}&limit=50` : "?limit=50";
      const res = await axios.get(`/conversations/${conversationId}/messages${params}`);
      const data = res.data;
      const newMessages = data.messages || res.data;
      const nextCursor = data.nextCursor || null;
      if (isInitial) {
        set({ messages: newMessages, nextCursor, isMessagesLoading: false, isLoadingMore: false });
      } else {
        set((state) => ({
          messages: [...newMessages, ...state.messages],
          nextCursor,
          isLoadingMore: false,
        }));
      }
      return { messages: newMessages, nextCursor };
    } catch (error) {
      console.error("GetMessages error:", error);
      set({ isMessagesLoading: false, isLoadingMore: false });
    }
  },

  sendMessage: async (data) => {
    try {
      const convId = data instanceof FormData ? data.get("conversationId") : data.conversationId;
      const isFormData = data instanceof FormData;
      const config = isFormData ? { timeout: 120000 } : {};
      const res = await axios.post(`/conversations/${convId}/messages`, data, config);
      set((state) => ({ messages: [...state.messages, res.data] }));
      return { success: true, data: res.data };
    } catch (error) {
      console.error("SendMessage error:", error);
      const message = error.response?.data?.error || error.message || "Failed to send message";
      return { success: false, error: message };
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

  markMessageRead: (messageId, userId, conversationId) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId
          ? { ...m, readBy: [...new Set([...(m.readBy || []), userId])] }
          : m
      ),
      conversations: conversationId
        ? state.conversations.map((c) =>
            c.id === conversationId && c.unreadCount > 0
              ? { ...c, unreadCount: c.unreadCount - 1 }
              : c
          )
        : state.conversations,
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

  pinMessage: async (messageId, conversationId) => {
    try {
      const res = await axios.post(`/conversations/messages/${messageId}/pin`, { conversationId });
      return res.data;
    } catch (error) {
      console.error("PinMessage error:", error);
    }
  },

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
