import { create } from "zustand";
import { getSocket } from "../stores/socketStore.js";

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
  callDuration: 0,
  isMuted: false,
  isSpeakerOn: false,
  isVideoEnabled: true,

  setIncomingCall: (callerId, type, conversationId) => {
    set({ incomingCallerId: callerId, incomingType: type, incomingConversationId: conversationId, status: "ringing" });
  },

  clearIncomingCall: () => {
    set({ incomingCallerId: null, incomingType: null, incomingConversationId: null, status: "idle" });
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
      set({ remoteStream: e.streams[0] });
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const socket = getSocket();
    socket?.emit("call:start", { receiverId: remoteUser.id, type, conversationId });
    socket?.emit("signal:offer", { to: remoteUser.id, offer });

    const durationInterval = setInterval(() => {
      set((s) => ({ callDuration: s.callDuration + 1 }));
    }, 1000);

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
      _durationInterval: durationInterval,
    });
  },

  acceptCall: async () => {
    const { incomingCallerId, incomingType, incomingConversationId } = get();
    if (!incomingCallerId) return;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: incomingType === "VIDEO" });
    const pc = new RTCPeerConnection(ICE_SERVERS);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const socket = getSocket();
        socket?.emit("signal:ice-candidate", { to: incomingCallerId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      set({ remoteStream: e.streams[0] });
    };

    const remoteUser = { id: incomingCallerId, fullName: "Caller" };

    const durationInterval = setInterval(() => {
      set((s) => ({ callDuration: s.callDuration + 1 }));
    }, 1000);

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
      _durationInterval: durationInterval,
    });

    const socket = getSocket();
    socket?.emit("call:accept", { callerId: incomingCallerId });
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
    const { peerConnection, localStream, remoteUser, _durationInterval } = get();
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
    });
  },

  handleSignalOffer: async (from, offer) => {
    const pc = get().peerConnection;
    if (!pc) return;
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
    const { peerConnection, localStream } = get();
    if (peerConnection) peerConnection.close();
    if (localStream) localStream.getTracks().forEach((t) => t.stop());
    clearInterval(get()._durationInterval);
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
