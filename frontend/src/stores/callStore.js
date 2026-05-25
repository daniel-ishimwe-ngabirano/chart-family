import { create } from "zustand";
import { getSocket } from "../stores/socketStore.js";
import { useChatStore } from "./chatStore.js";

const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export const useCallStore = create((set, get) => ({
  status: "idle", // idle | ringing | calling
  type: null, // "VOICE" | "VIDEO"
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

  setIncomingCall: (callerId, type, conversationId) => {
    set({ incomingCallerId: callerId, incomingType: type, incomingConversationId: conversationId, status: "ringing" });
  },

  clearIncomingCall: () => {
    set({ incomingCallerId: null, incomingType: null, incomingConversationId: null, pendingOffer: null, pendingCallerId: null, status: "idle" });
  },

  startCall: async (remoteUser, type, conversationId) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "VIDEO" });
    const pc = new RTCPeerConnection(ICE_SERVERS);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const socket = getSocket();
        socket?.emit("signal:ice-candidate", { to: remoteUser.id, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      const stream = e.streams[0];
      set({ remoteStream: stream });
    };

    pc.onnegotiationneeded = () => {
      // handled explicitly below to avoid race conditions
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        get().startTimer();
      }
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        get().endCall();
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const socket = getSocket();
    socket?.emit("call:start", { receiverId: remoteUser.id, type, conversationId });
    socket?.emit("signal:offer", { to: remoteUser.id, offer });

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
    });
  },

  acceptCall: async () => {
    const { incomingCallerId, incomingType, incomingConversationId, pendingOffer, pendingCallerId } = get();
    const callerId = incomingCallerId || pendingCallerId;
    if (!callerId) return;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: incomingType === "VIDEO" });
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

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        get().startTimer();
      }
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        get().endCall();
      }
    };

    const users = useChatStore.getState().users;
    const caller = users.find((u) => u.id === callerId);
    const remoteUser = { id: callerId, fullName: caller?.fullName || "Caller", avatar: caller?.avatar || "" };

    if (pendingOffer) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        const socket = getSocket();
        socket?.emit("signal:answer", { to: callerId, answer });
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
    });

    const socket = getSocket();
    socket?.emit("call:accept", { callerId });
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
    const { peerConnection, localStream, remoteUser, _durationInterval, type } = get();
    clearInterval(_durationInterval);

    if (peerConnection) {
      peerConnection.close();
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }

    if (remoteUser && get().status === "calling") {
      const socket = getSocket();
      socket?.emit("call:end", { receiverId: remoteUser.id });

      const direction = get().incomingCallerId || get().pendingCallerId ? "incoming" : "outgoing";
      const history = JSON.parse(localStorage.getItem("wavechat_call_history") || "[]");
      history.unshift({
        id: Date.now(),
        name: remoteUser.fullName || "Unknown",
        avatar: remoteUser.avatar || "",
        type: direction,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        duration: get().callDuration,
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
    if (!pc) return;
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
    const { peerConnection, localStream, remoteUser } = get();
    if (peerConnection) peerConnection.close();
    if (localStream) localStream.getTracks().forEach((t) => t.stop());
    clearInterval(get()._durationInterval);

    if (remoteUser && get().status !== "calling") {
      const direction = get().incomingCallerId || get().pendingCallerId ? "missed" : "missed";
      const history = JSON.parse(localStorage.getItem("wavechat_call_history") || "[]");
      history.unshift({
        id: Date.now(),
        name: remoteUser.fullName || "Unknown",
        avatar: remoteUser.avatar || "",
        type: direction,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        duration: 0,
        callType: get().type,
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
