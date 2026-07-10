import { create } from "zustand";
import { getSocket } from "../stores/socketStore.js";
import { useChatStore } from "./chatStore.js";
import { STORAGE_KEYS } from "../lib/constants.js";

let cachedIceServers = null;
async function getIceServers() {
  if (cachedIceServers) return cachedIceServers;
  const json = import.meta.env.VITE_ICE_SERVERS;
  if (json) {
    try {
      const parsed = JSON.parse(json);
      cachedIceServers = { iceServers: Array.isArray(parsed) ? parsed : parsed.iceServers };
      return cachedIceServers;
    } catch {}
  }
  const result = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
  if (import.meta.env.VITE_TURN_URL) {
    result.iceServers.push({
      urls: import.meta.env.VITE_TURN_URL,
      username: import.meta.env.VITE_TURN_USERNAME || "",
      credential: import.meta.env.VITE_TURN_CREDENTIAL || "",
    });
  }
  cachedIceServers = result;
  return result;
}

const CONNECTION_TIMEOUT_MS = 45000;
let connectionTimeoutId = null;

function clearConnectionTimeout() {
  if (connectionTimeoutId) {
    clearTimeout(connectionTimeoutId);
    connectionTimeoutId = null;
  }
}

function startConnectionTimeout(get) {
  clearConnectionTimeout();
  connectionTimeoutId = setTimeout(() => {
    const state = get();
    if (state.status === "calling" && !state.remoteStream) {
      console.warn("Call connection timed out");
      state.endCall();
    }
  }, CONNECTION_TIMEOUT_MS);
}

export const useCallStore = create((set, get) => ({
  status: "idle",
  error: null,
  type: null,
  remoteUser: null,
  conversationId: null,
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  incomingCallerId: null,
  incomingType: null,
  incomingConversationId: null,
  pendingOffer: null,
  pendingCallerId: null,
  callDuration: 0,
  isMuted: false,
  isSpeakerOn: false,
  isVideoEnabled: true,

  clearError: () => set({ error: null }),

  setIncomingCall: (callerId, type, conversationId) => {
    set({ incomingCallerId: callerId, incomingType: type, incomingConversationId: conversationId, status: "ringing" });
  },

  clearIncomingCall: () => {
    set({ incomingCallerId: null, incomingType: null, incomingConversationId: null, pendingOffer: null, pendingCallerId: null, status: "idle" });
  },

  startCall: async (remoteUser, type, conversationId) => {
    set({ status: "initializing", error: null, peerConnection: null });
    let stream;
    let actualType = type;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "VIDEO" });
    } catch (err) {
      if (type === "VIDEO") {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          actualType = "VOICE";
        } catch {
          set({ error: `Cannot access microphone: ${err.message || "Permission denied"}` });
          return;
        }
      } else {
        set({ error: `Cannot access microphone: ${err.message || "Permission denied"}`, status: "idle" });
        return;
      }
    }

    if (get().status === "idle") {
      if (stream) stream.getTracks().forEach(t => t.stop());
      return;
    }

    const iceServers = await getIceServers();
    const pc = new RTCPeerConnection(iceServers);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const socket = getSocket();
        const targetId = remoteUser.id;
        socket?.emit("signal:ice-candidate", { to: targetId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      const s = e.streams?.[0];
      if (s) {
        set({ remoteStream: s });
      } else if (e.track) {
        const existing = get().remoteStream;
        if (existing) {
          existing.addTrack(e.track);
        } else {
          set({ remoteStream: new MediaStream([e.track]) });
        }
      }
    };

    pc.onnegotiationneeded = () => {};

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") {
        clearConnectionTimeout();
        get().startTimer();
      }
      if (s === "disconnected" || s === "failed") {
        clearConnectionTimeout();
        get().endCall();
      }
    };

    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      console.log("ICE state:", iceState);
      if (iceState === "connected" || iceState === "completed") {
        clearConnectionTimeout();
        get().startTimer();
      }
      if (iceState === "failed") {
        console.warn("ICE failed, restarting...");
        pc.createOffer({ iceRestart: true }).then((offer) => {
          return pc.setLocalDescription(offer);
        }).then(() => {
          const socket = getSocket();
          const remote = get().remoteUser;
          if (socket && remote) {
            socket.emit("signal:offer", { to: remote.id, offer: pc.localDescription });
          }
        }).catch(() => {
          clearConnectionTimeout();
          get().endCall();
        });
      }
      if (iceState === "disconnected") {
        setTimeout(() => {
          if (pc.iceConnectionState === "disconnected") {
            clearConnectionTimeout();
            get().endCall();
          }
        }, 5000);
      }
    };

    let offer;
    try {
      offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
    } catch (err) {
      stream.getTracks().forEach((t) => t.stop());
      set({ error: `Failed to create call offer: ${err.message}` });
      return;
    }

    set({
      status: "calling",
      type: actualType,
      remoteUser,
      conversationId,
      localStream: stream,
      peerConnection: pc,
      remoteStream: null,
      callDuration: 0,
      isMuted: false,
      isSpeakerOn: false,
      isVideoEnabled: actualType === "VIDEO",
      error: null,
      pendingOffer: null,
      pendingCallerId: null,
    });

    const socket = getSocket();
    if (socket) {
      socket.emit("call:start-with-offer", {
        receiverId: remoteUser.id,
        type: actualType,
        conversationId,
        offer,
      });
    }

    startConnectionTimeout(get);
  },

  acceptCall: async () => {
    const { incomingCallerId, incomingType, incomingConversationId } = get();
    const callerId = incomingCallerId;
    if (!callerId) return;

    let stream;
    let actualType = incomingType;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: incomingType === "VIDEO" });
    } catch (err) {
      if (incomingType === "VIDEO") {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          actualType = "VOICE";
        } catch {
          set({ error: `Cannot access microphone: ${err.message || "Permission denied"}` });
          return;
        }
      } else {
        set({ error: `Cannot access microphone: ${err.message || "Permission denied"}` });
        return;
      }
    }

    if (get().status === "idle") {
      if (stream) stream.getTracks().forEach(t => t.stop());
      return;
    }

    const iceServers = await getIceServers();
    const pc = new RTCPeerConnection(iceServers);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const socket = getSocket();
        socket?.emit("signal:ice-candidate", { to: callerId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      const s = e.streams?.[0];
      if (s) {
        set({ remoteStream: s });
      } else if (e.track) {
        const existing = get().remoteStream;
        if (existing) {
          existing.addTrack(e.track);
        } else {
          set({ remoteStream: new MediaStream([e.track]) });
        }
      }
    };

    pc.onnegotiationneeded = () => {};

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") {
        clearConnectionTimeout();
        get().startTimer();
      }
      if (s === "disconnected" || s === "failed") {
        clearConnectionTimeout();
        get().endCall();
      }
    };

    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      console.log("ICE state (receiver):", iceState);
      if (iceState === "connected" || iceState === "completed") {
        clearConnectionTimeout();
        get().startTimer();
      }
      if (iceState === "failed") {
        console.warn("ICE failed on receiver");
        clearConnectionTimeout();
        get().endCall();
      }
      if (iceState === "disconnected") {
        setTimeout(() => {
          if (pc.iceConnectionState === "disconnected") {
            clearConnectionTimeout();
            get().endCall();
          }
        }, 5000);
      }
    };

    set({ peerConnection: pc });

    const users = useChatStore.getState().users;
    const caller = users.find((u) => u.id === callerId);
    const remoteUser = { id: callerId, fullName: caller?.fullName || "Caller", avatar: caller?.avatar || "" };

    const offer = get().pendingOffer;
    let answered = false;

    if (offer) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        const socket = getSocket();
        socket?.emit("signal:answer", { to: callerId, answer });
        answered = true;
      } catch (err) {
        console.error("Failed to answer:", err);
      }
    }

    set({
      status: "calling",
      type: actualType,
      remoteUser,
      conversationId: incomingConversationId,
      localStream: stream,
      remoteStream: get().remoteStream,
      callDuration: 0,
      isMuted: false,
      isSpeakerOn: false,
      isVideoEnabled: actualType === "VIDEO",
      incomingCallerId: null,
      incomingType: null,
      incomingConversationId: null,
      pendingOffer: answered ? null : get().pendingOffer,
      pendingCallerId: answered ? null : get().pendingCallerId,
      error: null,
    });

    const socket = getSocket();
    if (socket) {
      socket.emit("call:accept", { callerId });
    }

    if (!answered) {
      const retryOffer = get().pendingOffer;
      if (retryOffer) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(retryOffer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket?.emit("signal:answer", { to: callerId, answer });
          set({ pendingOffer: null, pendingCallerId: null });
          answered = true;
        } catch (err) {
          console.error("Retry answer failed:", err);
        }
      }
    }

    startConnectionTimeout(get);
  },

  startTimer: () => {
    if (get()._durationInterval) return;
    const interval = setInterval(() => {
      set((s) => ({ callDuration: s.callDuration + 1 }));
    }, 1000);
    set({ _durationInterval: interval });
  },

  rejectCall: () => {
    const { incomingCallerId } = get();
    if (incomingCallerId) {
      const socket = getSocket();
      socket?.emit("call:reject", { callerId: incomingCallerId });
    }
    get().endCall();
  },

  endCall: () => {
    const state = get();
    const { peerConnection, localStream, remoteUser, _durationInterval, type } = state;
    clearInterval(_durationInterval);
    clearConnectionTimeout();

    if (peerConnection) {
      peerConnection.close();
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }

    if (remoteUser && state.status === "calling") {
      const socket = getSocket();
      socket?.emit("call:end", { receiverId: remoteUser.id });

      const direction = state.incomingCallerId || state.pendingCallerId ? "incoming" : "outgoing";
      const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.CALL_HISTORY) || "[]");
      history.unshift({
        id: Date.now(),
        name: remoteUser.fullName || "Unknown",
        avatar: remoteUser.avatar || "",
        type: direction,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        duration: state.callDuration,
        callType: type,
      });
      localStorage.setItem(STORAGE_KEYS.CALL_HISTORY, JSON.stringify(history.slice(0, 50)));
    }

    set({
      status: "idle",
      type: null,
      remoteUser: null,
      conversationId: null,
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      callDuration: 0,
      isMuted: false,
      isSpeakerOn: false,
      isVideoEnabled: true,
      _durationInterval: null,
      pendingOffer: null,
      pendingCallerId: null,
      incomingCallerId: null,
      incomingType: null,
      incomingConversationId: null,
    });
  },

  handleSignalOffer: async (from, offer) => {
    const pc = get().peerConnection;
    if (!pc) {
      set({ pendingOffer: offer, pendingCallerId: from, status: "ringing", incomingCallerId: from });
      return;
    }

    if (pc.signalingState !== "stable") {
      console.log("handleSignalOffer: PC not stable, deferring", pc.signalingState);
      return;
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const socket = getSocket();
      socket?.emit("signal:answer", { to: from, answer });
    } catch (err) {
      console.error("Failed to handle offer:", err);
    }
  },

  handleSignalAnswer: async (answer) => {
    const pc = get().peerConnection;
    if (!pc) {
      console.warn("handleSignalAnswer: no PC");
      return;
    }
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error("Failed to handle answer:", err);
    }
  },

  handleIceCandidate: async (candidate) => {
    const pc = get().peerConnection;
    if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) {
      return;
    }
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error("Failed to add ICE candidate:", err);
    }
  },

  handleCallEnded: () => {
    const state = get();
    const { peerConnection, localStream, remoteUser, type } = state;
    if (peerConnection) peerConnection.close();
    if (localStream) localStream.getTracks().forEach((t) => t.stop());
    clearInterval(state._durationInterval);
    clearConnectionTimeout();

    if (remoteUser && state.status !== "calling") {
      const direction = state.incomingCallerId || state.pendingCallerId ? "incoming" : "outgoing";
      const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.CALL_HISTORY) || "[]");
      history.unshift({
        id: Date.now(),
        name: remoteUser.fullName || "Unknown",
        avatar: remoteUser.avatar || "",
        type: direction,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        duration: 0,
        callType: type,
      });
      localStorage.setItem(STORAGE_KEYS.CALL_HISTORY, JSON.stringify(history.slice(0, 50)));
    }
    set({
      status: "idle",
      type: null,
      remoteUser: null,
      conversationId: null,
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      callDuration: 0,
      _durationInterval: null,
      pendingOffer: null,
      pendingCallerId: null,
      incomingCallerId: null,
      incomingType: null,
      incomingConversationId: null,
    });
  },

  toggleMute: () => {
    const { localStream, isMuted } = get();
    localStream?.getAudioTracks().forEach((t) => { t.enabled = isMuted; });
    set({ isMuted: !isMuted });
  },

  toggleSpeaker: () => {
    set((s) => ({ isSpeakerOn: !s.isSpeakerOn }));
  },

  toggleVideo: () => {
    const { localStream, isVideoEnabled } = get();
    localStream?.getVideoTracks().forEach((t) => { t.enabled = !isVideoEnabled; });
    set({ isVideoEnabled: !isVideoEnabled });
  },
}));
