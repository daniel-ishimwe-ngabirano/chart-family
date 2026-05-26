import { create } from "zustand";
import { getSocket } from "../stores/socketStore.js";
import { useChatStore } from "./chatStore.js";

const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

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
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "VIDEO" });
    } catch (err) {
      set({ error: `Cannot access microphone${type === "VIDEO" ? "/camera" : ""}: ${err.message || "Permission denied"}` });
      return;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const socket = getSocket();
        socket?.emit("signal:ice-candidate", { to: remoteUser.id, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      set({ remoteStream: e.streams[0] });
    };

    pc.onnegotiationneeded = () => {};

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") {
        get().startTimer();
      }
      if (state === "disconnected" || state === "failed") {
        get().endCall();
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
      socket.emit("call:start", { receiverId: remoteUser.id, type, conversationId });
      socket.emit("signal:offer", { to: remoteUser.id, offer });
    }

    set({
      status: "calling",
      type,
      remoteUser,
      conversationId,
      localStream: stream,
      peerConnection: pc,
      remoteStream: null,
      callDuration: 0,
      isMuted: false,
      isSpeakerOn: false,
      isVideoEnabled: type === "VIDEO",
      error: null,
    });
  },

  acceptCall: async () => {
    const { incomingCallerId, incomingType, incomingConversationId } = get();
    const callerId = incomingCallerId;
    if (!callerId) return;

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: incomingType === "VIDEO" });
    } catch (err) {
      set({ error: `Cannot access microphone${incomingType === "VIDEO" ? "/camera" : ""}: ${err.message || "Permission denied"}` });
      return;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const socket = getSocket();
        socket?.emit("signal:ice-candidate", { to: callerId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      set({ remoteStream: e.streams[0] });
    };

    pc.onnegotiationneeded = () => {};

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") {
        get().startTimer();
      }
      if (state === "disconnected" || state === "failed") {
        get().endCall();
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
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        const socket = getSocket();
        socket?.emit("signal:answer", { to: callerId, answer });
        answered = true;
      } catch (err) {
        console.error("Failed to set pending offer:", err);
      }
    }

    set({
      status: "calling",
      type: incomingType,
      remoteUser,
      conversationId: incomingConversationId,
      localStream: stream,
      peerConnection: pc,
      remoteStream: null,
      callDuration: 0,
      isMuted: false,
      isSpeakerOn: false,
      isVideoEnabled: incomingType === "VIDEO",
      incomingCallerId: null,
      incomingType: null,
      incomingConversationId: null,
      pendingOffer: null,
      pendingCallerId: null,
      error: null,
    });

    const socket = getSocket();
    if (socket) {
      socket.emit("call:accept", { callerId });
    }

    if (!answered) {
      console.log("acceptCall: pendingOffer not yet available, answer will be created by handleSignalOffer");
    }
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
      const history = JSON.parse(localStorage.getItem("wavechat_call_history") || "[]");
      history.unshift({
        id: Date.now(),
        name: remoteUser.fullName || "Unknown",
        avatar: remoteUser.avatar || "",
        type: direction,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        duration: state.callDuration,
        callType: type,
      });
      localStorage.setItem("wavechat_call_history", JSON.stringify(history.slice(0, 50)));
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
    } catch (err) {
      console.error("Failed to handle answer:", err);
    }
  },

  handleIceCandidate: async (candidate) => {
    const pc = get().peerConnection;
    if (!pc) return;
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

    if (remoteUser && state.status !== "calling") {
      const direction = state.incomingCallerId || state.pendingCallerId ? "incoming" : "outgoing";
      const history = JSON.parse(localStorage.getItem("wavechat_call_history") || "[]");
      history.unshift({
        id: Date.now(),
        name: remoteUser.fullName || "Unknown",
        avatar: remoteUser.avatar || "",
        type: direction,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        duration: 0,
        callType: type,
      });
      localStorage.setItem("wavechat_call_history", JSON.stringify(history.slice(0, 50)));
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
