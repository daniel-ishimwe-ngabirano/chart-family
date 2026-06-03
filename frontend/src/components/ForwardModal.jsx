import { useState } from "react";
import { useChatStore } from "../stores/chatStore.js";
import { useAuthStore } from "../stores/authStore.js";
import { useTranslate } from "../hooks/useTranslate.js";
import { X, Search, Check, Send } from "lucide-react";
import axios from "../lib/axios.js";
import { handleAvatarError } from "../utils/avatar.js";

export default function ForwardModal({ message, onClose }) {
  const { conversations } = useChatStore();
  const { authUser } = useAuthStore();
  const t = useTranslate();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [sending, setSending] = useState(false);

  const filtered = conversations.filter((c) => {
    if (selected) return true;
    if (c.isGroup) return c.groupName?.toLowerCase().includes(search.toLowerCase());
    const other = c.members?.find((m) => m.user?.id !== authUser.id)?.user;
    return other?.fullName?.toLowerCase().includes(search.toLowerCase());
  });

  const handleForward = async () => {
    if (!selected) return;
    setSending(true);
    try {
      await axios.post(`/conversations/messages/${message.id}/forward`, {
        toConversationId: selected,
      });
      onClose();
    } catch (err) {
      console.error("Forward failed:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content forward-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t("chat.forwardMessage", "Forward Message")}</h2>
          <button onClick={onClose}><X size={22} /></button>
        </div>
        <div className="modal-body">
          <div className="search-bar">
            <Search size={18} />
            <input placeholder={t("chat.searchChats", "Search chats...")} value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
          </div>
          <div className="forward-list">
            {filtered.map((c) => {
              const name = c.isGroup ? c.groupName : c.members?.find((m) => m.user?.id !== authUser.id)?.user?.fullName || t("common.unknown", "Unknown");
              return (
                <div
                  key={c.id}
                  className={`forward-item ${selected === c.id ? "selected" : ""}`}
                  onClick={() => setSelected(c.id)}
                >
                  <img
                    src={c.isGroup ? c.groupAvatar : c.members?.find((m) => m.user?.id !== authUser.id)?.user?.avatar || ""}
                    alt=""
                    className="avatar"
                    onError={(e) => handleAvatarError(e, c.isGroup ? c.groupName : c.members?.find((m) => m.user?.id !== authUser.id)?.user?.fullName || t("common.unknown", "Unknown"))}
                  />
                  <span>{name}</span>
                  {selected === c.id && <Check size={18} className="check-icon" />}
                </div>
              );
            })}
          </div>
          <button className="btn-primary" onClick={handleForward} disabled={!selected || sending} style={{ marginTop: 12 }}>
            {sending ? t("chat.forwarding", "Forwarding...") : <><Send size={16} /> {t("chat.forwardHere", "Forward Here")}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
