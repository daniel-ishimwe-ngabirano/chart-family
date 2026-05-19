import { useState } from "react";
import { useChatStore } from "../../stores/chatStore.js";
import { useAuthStore } from "../../stores/authStore.js";
import { X, Image, FileText, Link as LinkIcon, Users, Bell, Shield, Ban } from "lucide-react";

export default function UserPanel({ onClose }) {
  const { selectedConversation } = useChatStore();
  const { authUser } = useAuthStore();
  const [tab, setTab] = useState("media");

  if (!selectedConversation) return null;

  const otherUser = selectedConversation?.isGroup ? null : selectedConversation?.members?.find((m) => m.user?.id !== authUser.id)?.user;

  return (
    <div className="user-panel">
      <div className="user-panel-header">
        <img src={otherUser?.avatar || selectedConversation?.groupAvatar || ""} alt="" className="user-panel-avatar" />
        <h3>{selectedConversation?.isGroup ? selectedConversation.groupName : otherUser?.fullName || "Unknown"}</h3>
        <button className="icon-btn" onClick={onClose}><X size={20} /></button>
      </div>

      <div className="user-panel-tabs">
        {["media", "files", "links", "members"].map((t) => (
          <button key={t} className={`up-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="user-panel-content">
        {tab === "media" && (
          <div className="up-grid">
            <div className="up-empty">Shared media will appear here</div>
          </div>
        )}
        {tab === "files" && <div className="up-empty">No shared files</div>}
        {tab === "links" && <div className="up-empty">No shared links</div>}
        {tab === "members" && selectedConversation?.isGroup && (
          <div className="up-member-list">
            {selectedConversation.members?.map((m) => (
              <div key={m.user?.id} className="up-member">
                <img src={m.user?.avatar} alt="" className="up-member-avatar" />
                <span>{m.user?.fullName}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="user-panel-actions">
        <button className="up-action" onClick={() => alert("Mute feature coming soon")}><Bell size={18} /> Mute</button>
        <button className="up-action" onClick={() => alert("Block feature coming soon")}><Shield size={18} /> Block</button>
        <button className="up-action" onClick={() => alert("Report feature coming soon")}><Ban size={18} /> Report</button>
      </div>
    </div>
  );
}
