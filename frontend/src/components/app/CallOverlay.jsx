import { useEffect, useRef } from "react";
import { useCallStore } from "../../stores/callStore.js";
import { PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";

export default function CallOverlay() {
  const {
    status, type, remoteUser, localStream, remoteStream,
    callDuration, isMuted, isVideoEnabled,
    endCall, toggleMute, toggleVideo,
  } = useCallStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  if (status !== "calling") return null;

  const durationStr = `${String(Math.floor(callDuration / 60)).padStart(2, "0")}:${String(callDuration % 60).padStart(2, "0")}`;

  return (
    <div className={`call-overlay ${type === "VIDEO" ? "video-call" : "voice-call"}`}>
      {type === "VIDEO" && remoteStream && (
        <video ref={remoteVideoRef} autoPlay playsInline className="call-remote-video" />
      )}

      {type === "VIDEO" && localStream && (
        <video ref={localVideoRef} autoPlay playsInline muted className="call-local-video" />
      )}

      {type === "VOICE" && (
        <div className="call-voice-avatar">
          <div className="call-avatar-ring">
            <img src={remoteUser?.avatar || ""} alt="" className="call-avatar-img" />
          </div>
        </div>
      )}

      {type === "VOICE" && (
        <div className="call-info">
          <div className="call-name">{remoteUser?.fullName || "Unknown"}</div>
          <div className="call-duration">{durationStr}</div>
        </div>
      )}

      {type === "VIDEO" && (
        <div className="call-info video-info">
          <div className="call-name">{remoteUser?.fullName || "Unknown"}</div>
          <div className="call-duration">{durationStr}</div>
        </div>
      )}

      <div className="call-controls">
        <button className={`call-control-btn ${isMuted ? "active" : ""}`} onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}>
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <button className="call-control-btn end-call" onClick={endCall} title="End call">
          <PhoneOff size={28} />
        </button>

        {type === "VIDEO" && (
          <button className={`call-control-btn ${!isVideoEnabled ? "active" : ""}`} onClick={toggleVideo} title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}>
            {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
          </button>
        )}
      </div>
    </div>
  );
}
