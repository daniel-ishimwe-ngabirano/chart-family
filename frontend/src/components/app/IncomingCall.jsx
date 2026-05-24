import { useCallStore } from "../../stores/callStore.js";
import { useChatStore } from "../../stores/chatStore.js";
import { Phone, X } from "lucide-react";

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

  return (
    <div className="incoming-call-overlay">
      <div className="incoming-call-card">
        <div className="incoming-call-avatar">
          <div className="call-avatar-ring">
            <img src={callerAvatar} alt="" className="call-avatar-img" />
          </div>
        </div>
        <div className="incoming-call-info">
          <div className="incoming-call-name">{callerName}</div>
          <div className="incoming-call-type">
            {incomingType === "VIDEO" ? "📹 Video call" : "📞 Voice call"}
          </div>
        </div>
        <div className="incoming-call-actions">
          <button className="incoming-btn decline" onClick={rejectCall}>
            <X size={24} />
          </button>
          <button className="incoming-btn accept" onClick={acceptCall}>
            <Phone size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
