import { useCallStore } from "../../stores/callStore.js";
import { useChatStore } from "../../stores/chatStore.js";
import { Phone, X, Video, PhoneOff } from "lucide-react";

export default function IncomingCall() {
  const {
    status, incomingCallerId, incomingType,
    acceptCall, rejectCall,
  } = useCallStore();
  const { users } = useChatStore();

  if (status !== "ringing" || !incomingCallerId) return null;

  const caller = users.find((u) => u.id === incomingCallerId);
  const callerName = caller?.fullName || "Incoming Call";
  const callerAvatar = caller?.avatar || "";

  const handleAccept = () => {
    if (incomingType === "VIDEO") acceptCall();
    else acceptCall();
  };

  return (
    <div className="incoming-call-overlay">
      <div className="incoming-call-bg" />
      <div className="incoming-call-content">
        <div className="incoming-call-avatar-wrapper">
          <div className="incoming-avatar-ring">
            <img src={callerAvatar || "/default-avatar.svg"} alt="" className="incoming-caller-img" />
          </div>
        </div>
        <div className="incoming-call-name">{callerName}</div>
        <div className="incoming-call-label">
          {incomingType === "VIDEO" ? "WhatsApp Video Call…" : "WhatsApp Voice Call…"}
        </div>
        <div className="incoming-call-actions">
          <button className="incoming-btn decline" onClick={rejectCall}>
            <div className="incoming-btn-circle decline-circle">
              <X size={28} />
            </div>
            <span>Decline</span>
          </button>
          <button className="incoming-btn accept" onClick={handleAccept}>
            <div className="incoming-btn-circle accept-circle">
              {incomingType === "VIDEO" ? <Video size={28} /> : <Phone size={28} />}
            </div>
            <span>{incomingType === "VIDEO" ? "Accept" : "Accept"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
