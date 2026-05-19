import { io } from "socket.io-client";
import { useAuthStore } from "./authStore.js";
import { useChatStore } from "./chatStore.js";
import { useCallStore } from "./callStore.js";
import { useFeatureStore } from "./featureStore.js";
import { useSettingsStore } from "./settingsStore.js";
import { playMessageReceived, playCallRingtone, playCallConnected, playCallEnded } from "../lib/sounds.js";

const SOCKET_URL = import.meta.env.VITE_API_URL || "";

let socket = null;
let stopRingtone = null;

export const getSocket = () => socket;

export const connectSocket = () => {
  const authUser = useAuthStore.getState().authUser;
  if (!authUser || socket?.connected) return;

  socket = io(SOCKET_URL, {
    auth: { token: useAuthStore.getState().token },
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    console.log("Socket connected");
  });

  socket.on("message:new", (message) => {
    const authUser = useAuthStore.getState().authUser;
    if (message.senderId === authUser?.id) return;
    useChatStore.getState().addMessage(message);
    useChatStore.getState().getConversations();
    playMessageReceived();
  });

  socket.on("message:updated", (message) => {
    useChatStore.getState().updateMessage(message);
  });

  socket.on("message:deleted", ({ messageId, conversationId }) => {
    useChatStore.getState().removeMessage(messageId);
  });

  socket.on("message:read", ({ messageId, userId }) => {
    useChatStore.getState().markMessageRead(messageId, userId);
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

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
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

