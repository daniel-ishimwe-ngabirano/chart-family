import { useState, useEffect } from "react";
import { useAuthStore } from "../../stores/authStore.js";
import { useChatStore } from "../../stores/chatStore.js";
import { useFeatureStore } from "../../stores/featureStore.js";
import { useTranslate } from "../../hooks/useTranslate.js";
import { Search, UserPlus, MessageSquare, Users, Archive } from "lucide-react";
import NewConversationModal from "../NewConversationModal.jsx";

export default function ChatList({ onSelectChat, groupFilter }) {
  const { authUser } = useAuthStore();
  const {
    conversations, selectedConversation,
    setSelectedConversation: selectConv, onlineUsers,
  } = useChatStore();
  const features = useFeatureStore();
  const t = useTranslate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(groupFilter ? "groups" : "all");
  const [showNewConv, setShowNewConv] = useState(false);

  useEffect(() => {
    if (groupFilter) setFilter("groups");
  }, [groupFilter]);

  const groupsEnabled = features.isEnabled("groups_enabled");

  const filtered = conversations.filter((c) => {
    if (filter === "groups" && !c.isGroup) return false;
    const name = c.isGroup ? c.groupName : c.members?.find((m) => m.user?.id !== authUser.id)?.user?.fullName || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const getName = (c) => {
    if (c.isGroup) return c.groupName;
    return c.members?.find((m) => m.user?.id !== authUser.id)?.user?.fullName || "Unknown";
  };

  const getAvatar = (c) => {
    if (c.isGroup) return c.groupAvatar;
    return c.members?.find((m) => m.user?.id !== authUser.id)?.user?.avatar || "";
  };

  const isOnline = (c) => {
    if (c.isGroup) return false;
    const other = c.members?.find((m) => m.user?.id !== authUser.id)?.user;
    return other ? onlineUsers.has(other.id) : false;
  };

  const getLastMsg = (c) => {
    if (!c.lastMessage) return t("chat.noMessages", "No messages yet");
    if (c.lastMessage.isDeleted) return "Message deleted";
    return c.lastMessage.text || (c.lastMessage.type === "IMAGE" ? "📷 Image" : c.lastMessage.type === "VIDEO" ? "🎥 Video" : "Media");
  };

  const filters = [
    { key: "all", label: t("chat.all", "All"), icon: <MessageSquare size={14} /> },
    { key: "unread", label: t("chat.unread", "Unread") },
    { key: "groups", label: t("nav.groups", "Groups"), icon: <Users size={14} /> },
    { key: "archived", label: t("chat.archived", "Archived"), icon: <Archive size={14} /> },
  ];

  return (
    <div className="chat-list-panel">
      <div className="chat-list-header">
        <h2>{t("nav.chats", "Chats")}</h2>
        <button className="icon-btn" onClick={() => setShowNewConv(true)}><UserPlus size={20} /></button>
      </div>
      <div className="chat-list-search">
        <Search size={18} />
        <input type="text" placeholder={t("chat.search", "Search chats...")} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="chat-list-filters">
        {filters.map((f) => (
          !(f.key === "groups" && !groupsEnabled) && (
            <button
              key={f.key}
              className={`filter-chip ${filter === f.key ? "active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.icon} {f.label}
            </button>
          )
        ))}
      </div>
      <div className="chat-list-items">
        {filtered.map((c) => (
          <div
            key={c.id}
            className={`chat-list-item ${selectedConversation?.id === c.id ? "active" : ""}`}
            onClick={() => { selectConv(c); onSelectChat?.(); }}
          >
            <div className="chat-list-avatar">
              <img src={getAvatar(c)} alt="" />
              {isOnline(c) && <span className="online-badge" />}
            </div>
            <div className="chat-list-info">
              <div className="chat-list-top">
                <span className="chat-list-name">{getName(c)}</span>
                <span className="chat-list-time">{c.lastMessage ? new Date(c.lastMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
              </div>
              <div className="chat-list-bottom">
                <span className="chat-list-preview">{getLastMsg(c)}</span>
                {c.unreadCount > 0 && <span className="unread-badge">{c.unreadCount}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
      {showNewConv && <NewConversationModal onClose={() => setShowNewConv(false)} />}
    </div>
  );
}
