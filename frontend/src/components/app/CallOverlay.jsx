import { useEffect, useRef } from "react";
import { useCallStore } from "../../stores/callStore.js";
import { PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, AlertCircle } from "lucide-react";
import { handleAvatarError } from "../../utils/avatar.js";

export default function CallOverlay() {
  const {
    status, type, remoteUser, localStream, remoteStream,
    callDuration, isMuted, isVideoEnabled, isSpeakerOn, error,
    endCall, toggleMute, toggleVideo, toggleSpeaker, clearError,
  } = useCallStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  if (status !== "calling") return null;

  const durationStr = `${String(Math.floor(callDuration / 60)).padStart(2, "0")}:${String(callDuration % 60).padStart(2, "0")}`;

  return (
    <div className={`call-overlay ${type === "VIDEO" ? "video-call" : "voice-call"}`}>
      {type === "VOICE" && remoteStream && (
        <audio ref={remoteAudioRef} autoPlay />
      )}

      {type === "VIDEO" && remoteStream && (
        <video ref={remoteVideoRef} autoPlay playsInline className="call-remote-video" />
      )}

      {type === "VIDEO" && !remoteStream && (
        <div className="call-video-waiting">
          <div className="call-waiting-avatar">
            <img src={remoteUser?.avatar || "/default-avatar.svg"} alt="" />
          </div>
          <div className="call-waiting-text">Connecting…</div>
        </div>
      )}

      {type === "VIDEO" && localStream && (
        <div className="call-local-video-wrapper">
          <video ref={localVideoRef} autoPlay playsInline muted className="call-local-video" />
        </div>
      )}

      {type === "VOICE" && (
        <>
          <div className="call-voice-avatar">
            <div className="call-voice-ring">
              <img src={remoteUser?.avatar || "/default-avatar.svg"} alt="" className="call-voice-img" />
            </div>
            <div className="call-voice-ring-inner" />
          </div>
          <div className="call-voice-info">
            <div className="call-voice-name">{remoteUser?.fullName || "Unknown"}</div>
            <div className="call-voice-duration">{durationStr}</div>
          </div>
        </>
      )}

      {type === "VIDEO" && (
        <div className="call-video-info">
          <div className="call-video-name">{remoteUser?.fullName || "Unknown"}</div>
          <div className="call-video-duration">{durationStr}</div>
        </div>
      )}

      {error && (
        <div className="call-error-bar">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={clearError} className="call-error-close">&times;</button>
        </div>
      )}

      <div className="call-bottom-controls">
        <button
          className={`call-ctrl-btn ${isMuted ? "active" : ""}`}
          onClick={toggleMute}
          title={isMuted ? "Unmute" : "Mute"}
        >
          <div className="call-ctrl-circle">
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </div>
          <span>{isMuted ? "Unmute" : "Mute"}</span>
        </button>

        <button
          className="call-ctrl-btn end"
          onClick={endCall}
          title="End call"
        >
          <div className="call-ctrl-circle end-circle">
            <PhoneOff size={28} />
          </div>
          <span>End</span>
        </button>

        {type === "VIDEO" && (
          <button
            className={`call-ctrl-btn ${!isVideoEnabled ? "active" : ""}`}
            onClick={toggleVideo}
            title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
          >
            <div className="call-ctrl-circle">
              {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
            </div>
            <span>{isVideoEnabled ? "Video" : "Video Off"}</span>
          </button>
        )}

        {type === "VOICE" && (
          <button
            className={`call-ctrl-btn ${isSpeakerOn ? "active" : ""}`}
            onClick={toggleSpeaker}
            title={isSpeakerOn ? "Speaker Off" : "Speaker"}
          >
            <div className="call-ctrl-circle">
              <Volume2 size={24} />
            </div>
            <span>Speaker</span>
          </button>
        )}
      </div>
    </div>
  );
}
