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

// --- ICE candidate queue for candidates arriving before peer connection exists ---
let pendingIceCandidates = [];

// --- Connection timeout duration (30 seconds) ---
const CONNECTION_TIMEOUT_MS = 30000;
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
      console.warn("Call connection timed out after 30 seconds");
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
        set({ error: `Cannot access microphone: ${err.message || "Permission denied"}` });
        return;
      }
    }

    // Clear any stale queued candidates from a previous call
    pendingIceCandidates = [];

    const iceServers = await getIceServers();
    const pc = new RTCPeerConnection(iceServers);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const socket = getSocket();
        socket?.emit("signal:ice-candidate", { to: remoteUser.id, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      const existing = get().remoteStream;
      if (existing) {
        e.streams[0]?.getTracks().forEach((t) => existing.addTrack(t));
      } else {
        set({ remoteStream: e.streams[0] });
      }
      if (get().type === "VIDEO" && !e.streams[0]?.getVideoTracks().length) {
        set({ type: "VOICE", isVideoEnabled: false });
      }
    };

    pc.onnegotiationneeded = () => {};

    // --- Monitor BOTH connectionState and iceConnectionState ---
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") {
        clearConnectionTimeout();
        get().startTimer();
      }
      if (state === "disconnected" || state === "failed") {
        clearConnectionTimeout();
        get().endCall();
      }
    };

    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      console.log("ICE connection state:", iceState);

      if (iceState === "connected" || iceState === "completed") {
        clearConnectionTimeout();
        get().startTimer();
      }

      if (iceState === "failed") {
        // Attempt ICE restart before giving up
        console.warn("ICE connection failed, attempting ICE restart...");
        try {
          pc.createOffer({ iceRestart: true }).then((offer) => {
            return pc.setLocalDescription(offer);
          }).then(() => {
            const socket = getSocket();
            const remote = get().remoteUser;
            if (socket && remote) {
              socket.emit("signal:offer", { to: remote.id, offer: pc.localDescription });
            }
          }).catch((err) => {
            console.error("ICE restart failed:", err);
            clearConnectionTimeout();
            get().endCall();
          });
        } catch {
          clearConnectionTimeout();
          get().endCall();
        }
      }

      if (iceState === "disconnected") {
        // Give it a few seconds to recover before ending
        setTimeout(() => {
          if (pc.iceConnectionState === "disconnected") {
            console.warn("ICE still disconnected after grace period, ending call");
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

    const socket = getSocket();
    if (socket) {
      socket.emit("call:start", { receiverId: remoteUser.id, type: actualType, conversationId });
      socket.emit("signal:offer", { to: remoteUser.id, offer });
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
    });

    // Start connection timeout — if not connected in 30s, end the call
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
      const existing = get().remoteStream;
      if (existing) {
        e.streams[0]?.getTracks().forEach((t) => existing.addTrack(t));
      } else {
        set({ remoteStream: e.streams[0] });
      }
      if (get().type === "VIDEO" && !e.streams[0]?.getVideoTracks().length) {
        set({ type: "VOICE", isVideoEnabled: false });
      }
    };

    pc.onnegotiationneeded = () => {};

    // --- Monitor BOTH connectionState and iceConnectionState ---
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") {
        clearConnectionTimeout();
        get().startTimer();
      }
      if (state === "disconnected" || state === "failed") {
        clearConnectionTimeout();
        get().endCall();
      }
    };

    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      console.log("ICE connection state (receiver):", iceState);

      if (iceState === "connected" || iceState === "completed") {
        clearConnectionTimeout();
        get().startTimer();
      }

      if (iceState === "failed") {
        console.warn("ICE connection failed on receiver side");
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

    const users = useChatStore.getState().users;
    const caller = users.find((u) => u.id === callerId);
    const remoteUser = { id: callerId, fullName: caller?.fullName || "Caller", avatar: caller?.avatar || "" };

    let answered = false;

    const currentState = get();
    const offer = currentState.pendingOffer;
    if (offer) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // --- Flush any ICE candidates that arrived while we had no peer connection ---
        if (pendingIceCandidates.length > 0) {
          console.log(`Flushing ${pendingIceCandidates.length} queued ICE candidates`);
          for (const candidate of pendingIceCandidates) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.warn("Failed to add queued ICE candidate:", err);
            }
          }
          pendingIceCandidates = [];
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        const socket = getSocket();
        socket?.emit("signal:answer", { to: callerId, answer });
        answered = true;
      } catch (err) {
        console.error("Failed to set pending offer:", err);
      }
    }

    const currentRemoteStream = get().remoteStream;
    const stateUpdates = {
      status: "calling",
      type: actualType,
      remoteUser,
      conversationId: incomingConversationId,
      localStream: stream,
      peerConnection: pc,
      remoteStream: currentRemoteStream,
      callDuration: 0,
      isMuted: false,
      isSpeakerOn: false,
      isVideoEnabled: actualType === "VIDEO",
      incomingCallerId: null,
      incomingType: null,
      incomingConversationId: null,
      error: null,
    };

    if (answered) {
      stateUpdates.pendingOffer = null;
      stateUpdates.pendingCallerId = null;
    }
    set(stateUpdates);

    const socket = getSocket();
    if (socket) {
      socket.emit("call:accept", { callerId });
    }

    if (!answered) {
      const retryOffer = get().pendingOffer;
      if (retryOffer) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(retryOffer));

          // --- Flush queued ICE candidates on retry path too ---
          if (pendingIceCandidates.length > 0) {
            console.log(`Flushing ${pendingIceCandidates.length} queued ICE candidates (retry path)`);
            for (const candidate of pendingIceCandidates) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (err) {
                console.warn("Failed to add queued ICE candidate:", err);
              }
            }
            pendingIceCandidates = [];
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket?.emit("signal:answer", { to: callerId, answer });
          set({ pendingOffer: null, pendingCallerId: null });
        } catch (err) {
          console.error("Failed to handle late offer:", err);
        }
      }
    }

    // Start connection timeout for the receiver side too
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
    pendingIceCandidates = [];
    get().endCall();
  },

  endCall: () => {
    const state = get();
    const { peerConnection, localStream, remoteUser, _durationInterval, type } = state;
    clearInterval(_durationInterval);
    clearConnectionTimeout();

    // Clear queued ICE candidates
    pendingIceCandidates = [];

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

    const signalingState = pc.signalingState;
    if (signalingState !== "stable") {
      console.log("handleSignalOffer: PC not in stable state, deferring", signalingState);
      return;
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // --- Flush any queued ICE candidates now that remote description is set ---
      if (pendingIceCandidates.length > 0) {
        console.log(`Flushing ${pendingIceCandidates.length} queued ICE candidates after re-offer`);
        for (const candidate of pendingIceCandidates) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn("Failed to add queued ICE candidate:", err);
          }
        }
        pendingIceCandidates = [];
      }

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
      console.warn("handleSignalAnswer: no peer connection");
      return;
    }
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      // --- Flush any queued ICE candidates now that remote description is set ---
      if (pendingIceCandidates.length > 0) {
        console.log(`Flushing ${pendingIceCandidates.length} queued ICE candidates after answer`);
        for (const candidate of pendingIceCandidates) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn("Failed to add queued ICE candidate:", err);
          }
        }
        pendingIceCandidates = [];
      }
    } catch (err) {
      console.error("Failed to handle answer:", err);
    }
  },

  handleIceCandidate: async (candidate) => {
    const pc = get().peerConnection;

    // --- Queue candidates if no peer connection or no remote description yet ---
    if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) {
      console.log("Queuing ICE candidate (no PC or no remote description yet)");
      pendingIceCandidates.push(candidate);
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
    pendingIceCandidates = [];

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
