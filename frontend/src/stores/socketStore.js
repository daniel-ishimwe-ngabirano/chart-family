import { io } from "socket.io-client";
import axios from "../lib/axios.js";
import { useAuthStore } from "./authStore.js";
import { useChatStore } from "./chatStore.js";
import { useCallStore } from "./callStore.js";
import { useFeatureStore } from "./featureStore.js";
import { useSettingsStore } from "./settingsStore.js";
import { playMessageReceived, playCallRingtone, playCallConnected, playCallEnded } from "../lib/sounds.js";

const SOCKET_URL = import.meta.env.VITE_API_URL || "";

let socket = null;
let stopRingtone = null;

const connectionListeners = new Set();
let isConnected = false;

export const getSocket = () => socket;
export const getSocketStatus = () => isConnected;
export const onConnectionChange = (listener) => {
  connectionListeners.add(listener);
  listener(isConnected);
  return () => connectionListeners.delete(listener);
};

const notifyConnection = (status) => {
  isConnected = status;
  connectionListeners.forEach((l) => l(status));
};

export const connectSocket = () => {
  const authUser = useAuthStore.getState().authUser;
  if (!authUser || socket?.connected) return;

  socket = io(SOCKET_URL, {
    auth: { token: useAuthStore.getState().token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
    forceNew: true,
  });

  socket.on("connect", () => {
    notifyConnection(true);
  });

  socket.on("connect_error", async (err) => {
    console.warn("Socket connection error:", err.message);
    if (err.message === "Invalid token" || err.message === "Authentication required") {
      try {
        const res = await axios.post("/auth/refresh");
        if (res.data?.accessToken) {
          useAuthStore.setState({ token: res.data.accessToken });
          socket.auth = { token: res.data.accessToken };
        }
      } catch {
        useAuthStore.getState().checkAuth();
        const token = useAuthStore.getState().token;
        if (token) socket.auth = { token };
      }
      socket.connect();
    }
  });

  socket.on("message:new", (message) => {
    const authUser = useAuthStore.getState().authUser;
    if (message.senderId === authUser?.id) return;
    useChatStore.getState().addMessage(message);
    useChatStore.getState().getConversations();

    const state = useChatStore.getState();
    if (state.selectedConversation?.id === message.conversationId) {
      emitMarkAsRead(message.conversationId, message.id, authUser.id);
    } else {
      playMessageReceived();
      const sender = message.sender;
      window.dispatchEvent(new CustomEvent("app:notification", {
        detail: {
          id: message.id,
          title: sender?.fullName || "New message",
          body: message.text || (message.type === "IMAGE" ? "📷 Image" : message.type === "VIDEO" ? "🎥 Video" : "📎 Media"),
          avatar: sender?.avatar || "",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          type: "message",
          conversationId: message.conversationId,
        },
      }));
    }
  });

  socket.on("message:updated", (message) => {
    useChatStore.getState().updateMessage(message);
  });

  socket.on("message:deleted", ({ messageId, conversationId }) => {
    useChatStore.getState().removeMessage(messageId);
  });

  socket.on("message:read", ({ messageId, userId, conversationId }) => {
    useChatStore.getState().markMessageRead(messageId, userId, conversationId);
  });

  socket.on("user:online", ({ userId }) => {
    useChatStore.getState().setOnlineUsers((prev) => new Set([...prev, userId]));
  });

  socket.on("user:offline", ({ userId }) => {
    useChatStore.getState().setOnlineUsers((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  });

  socket.on("typing:start", ({ conversationId, userId, fullName }) => {
    useChatStore.getState().addTypingUser(conversationId, { userId, fullName });
  });

  socket.on("typing:stop", ({ conversationId, userId }) => {
    useChatStore.getState().removeTypingUser(conversationId, userId);
  });

  socket.on("call:incoming", ({ callerId, type, conversationId }) => {
    if (stopRingtone) stopRingtone();
    stopRingtone = playCallRingtone();
    useCallStore.getState().setIncomingCall(callerId, type, conversationId);
    window.dispatchEvent(new CustomEvent("app:notification", {
      detail: {
        id: `call-${callerId}`,
        title: "Incoming Call",
        body: type === "VIDEO" ? "📹 Video call incoming..." : "📞 Voice call incoming...",
        avatar: "",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "call",
      },
    }));
  });

  socket.on("call:accepted", ({ userId }) => {
    if (stopRingtone) { stopRingtone(); stopRingtone = null; }
    playCallConnected();
  });

  socket.on("call:rejected", ({ userId }) => {
    if (stopRingtone) { stopRingtone(); stopRingtone = null; }
    useCallStore.getState().endCall();
  });

  socket.on("call:ended", () => {
    if (stopRingtone) { stopRingtone(); stopRingtone = null; }
    playCallEnded();
    useCallStore.getState().handleCallEnded();
  });

  socket.on("signal:offer", ({ from, offer }) => {
    useCallStore.getState().handleSignalOffer(from, offer);
  });

  socket.on("signal:answer", ({ from, answer }) => {
    useCallStore.getState().handleSignalAnswer(answer);
  });

  socket.on("signal:ice-candidate", ({ from, candidate }) => {
    useCallStore.getState().handleIceCandidate(candidate);
  });

  socket.on("features:updated", (feature) => {
    useFeatureStore.getState().applyFeatureUpdate(feature);
  });

  socket.on("settings:updated", (settings) => {
    useSettingsStore.getState().applySettingsUpdate(settings);
  });

  socket.on("sections:updated", () => {
    window.dispatchEvent(new CustomEvent("sections:updated"));
  });

  socket.on("conversation:new", ({ conversation, forMembers }) => {
    if (forMembers?.includes(useAuthStore.getState().authUser?.id)) {
      useChatStore.getState().getConversations();
    }
  });

  socket.on("conversation:updated", () => {
    useChatStore.getState().getConversations();
  });

  socket.on("group:member-removed", ({ conversationId, userId }) => {
    const authUser = useAuthStore.getState().authUser;
    if (userId === authUser?.id) {
      const chatState = useChatStore.getState();
      if (chatState.selectedConversation?.id === conversationId) {
        chatState.setSelectedConversation(null);
      }
    }
    useChatStore.getState().getConversations();
  });

  socket.on("group:member-left", ({ conversationId, userId }) => {
    useChatStore.getState().getConversations();
  });

  socket.on("disconnect", () => {
    notifyConnection(false);
    const callState = useCallStore.getState();
    if (callState.status === "calling") {
      callState.endCall();
    }
  });
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
    socket = null;
  }
};

export const joinConversation = (conversationId) => {
  socket?.emit("conversation:join", conversationId);
};

export const leaveConversation = (conversationId) => {
  socket?.emit("conversation:leave", conversationId);
};

export const emitTyping = (conversationId, userId, fullName) => {
  socket?.emit("typing:start", { conversationId, userId, fullName });
};

export const emitStopTyping = (conversationId, userId) => {
  socket?.emit("typing:stop", { conversationId, userId });
};

export const emitMarkAsRead = (conversationId, messageId, userId) => {
  socket?.emit("message:read", { conversationId, messageId, userId });
};

export default socket;

