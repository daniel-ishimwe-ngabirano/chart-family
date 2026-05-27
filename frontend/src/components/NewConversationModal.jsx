import { useState } from "react";
import { useAuthStore } from "../stores/authStore.js";
import { useChatStore } from "../stores/chatStore.js";
import { X, Search, MessageSquare } from "lucide-react";
import { useTranslate } from "../hooks/useTranslate.js";
import { handleAvatarError } from "../utils/avatar.js";

export default function NewConversationModal({ onClose }) {
  const { authUser } = useAuthStore();
  const { users, getOrCreateConversation, setSelectedConversation, onlineUsers } = useChatStore();
  const t = useTranslate();
  const [search, setSearch] = useState("");

  const filtered = users.filter(
    (u) => u.id !== authUser?.id && u.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async (userId) => {
    const conv = await getOrCreateConversation(userId);
    if (conv) {
      setSelectedConversation(conv);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content group-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t("chat.newConversation", "New Conversation")}</h2>
          <button onClick={onClose}><X size={22} /></button>
        </div>
        <div className="modal-body">
          <div className="search-bar" style={{ margin: "12px 0" }}>
            <Search size={18} />
            <input
              type="text"
              placeholder={t("chat.searchUsers", "Search users...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="user-select-list">
            {filtered.length === 0 ? (
              <div className="empty-state">{t("chat.noUsersFound", "No users found")}</div>
            ) : (
              filtered.map((user) => (
                <div
                  key={user.id}
                  className="user-select-item"
                  onClick={() => handleSelect(user.id)}
                >
                  <div className="avatar-wrapper">
                    <img src={user.avatar || "/avatar-placeholder.png"} alt="" className="avatar" onError={(e) => handleAvatarError(e, user.fullName)} />
                    {onlineUsers.has(user.id) && <span className="online-dot" />}
                  </div>
                  <div className="user-select-info">
                    <span className="user-select-name">{user.fullName}</span>
                    <span className="user-select-email">{user.email}</span>
                  </div>
                  <MessageSquare size={18} className="chat-icon" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
