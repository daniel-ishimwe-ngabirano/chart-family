import { useState, useEffect } from "react";
import { useAuthStore } from "../../stores/authStore.js";
import { useChatStore } from "../../stores/chatStore.js";
import { useFeatureStore } from "../../stores/featureStore.js";
import { useStoryStore } from "../../stores/storyStore.js";
import { useTranslate } from "../../hooks/useTranslate.js";
import { Search, UserPlus, MessageSquare, Users, Archive } from "lucide-react";
import NewConversationModal from "../NewConversationModal.jsx";
import GroupModal from "../GroupModal.jsx";
import { handleAvatarError } from "../../utils/avatar.js";

export default function ChatList({ onSelectChat, groupFilter }) {
  const { authUser } = useAuthStore();
  const {
    conversations, selectedConversation,
    setSelectedConversation: selectConv, onlineUsers, typingUsers,
  } = useChatStore();
  const features = useFeatureStore();
  const { groups, openViewer } = useStoryStore();
  const t = useTranslate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(groupFilter ? "groups" : "all");
  const [showNewConv, setShowNewConv] = useState(false);
  const [showGroup, setShowGroup] = useState(false);

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

  const getOtherUserId = (c) => c.isGroup ? null : c.members?.find((m) => m.user?.id !== authUser.id)?.user?.id;

  const storyMap = {};
  for (const g of groups) {
    if (g.user.id !== authUser?.id) {
      storyMap[g.user.id] = { group: g, count: g.stories.length };
    }
  }

  const getLastMsg = (c) => {
    const typing = typingUsers[c.id]?.filter((u) => u.userId !== authUser.id);
    if (typing?.length > 0) {
      return `✍️ ${typing[0].fullName}${typing.length > 1 ? ` and ${typing.length - 1} other${typing.length > 2 ? "s" : ""}` : ""} typing...`;
    }
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
        <div style={{ display: "flex", gap: 4 }}>
          <button className="icon-btn" onClick={() => setShowNewConv(true)} title="New chat"><UserPlus size={20} /></button>
          {groupsEnabled && (
            <button className="icon-btn" onClick={() => setShowGroup(true)} title="Create group"><Users size={20} /></button>
          )}
        </div>
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
        {filtered.map((c) => {
          const otherId = getOtherUserId(c);
          const storyData = otherId ? storyMap[otherId] : null;
          const storyCount = storyData?.count || 0;
          return (
            <div
              key={c.id}
              className={`chat-list-item ${selectedConversation?.id === c.id ? "active" : ""}`}
            >
              <div className="chat-list-avatar-wrap"
                onClick={(e) => {
                  if (storyCount > 0) {
                    e.stopPropagation();
                    openViewer(otherId, 0);
                  }
                }}
                style={{ cursor: storyCount > 0 ? "pointer" : "default" }}
              >
                <div className={`chat-list-avatar ${storyCount > 0 ? "has-story" : ""}`}>
                  {storyCount > 0 && (
                    <svg className="story-ring" viewBox="0 0 50 50" width="50" height="50">
                      {storyCount === 1 ? (
                        <circle cx="25" cy="25" r="23" fill="none" stroke="#25d366" strokeWidth="2.5" />
                      ) : (
                        Array.from({ length: storyCount }).map((_, i) => {
                          const segAngle = 360 / storyCount;
                          const startAngle = -90 + i * segAngle;
                          const endAngle = startAngle + segAngle - 1.5;
                          const startRad = (startAngle * Math.PI) / 180;
                          const endRad = (endAngle * Math.PI) / 180;
                          const x1 = 25 + 23 * Math.cos(startRad);
                          const y1 = 25 + 23 * Math.sin(startRad);
                          const x2 = 25 + 23 * Math.cos(endRad);
                          const y2 = 25 + 23 * Math.sin(endRad);
                          const largeArc = segAngle > 180 ? 1 : 0;
                          return (
                            <path key={i} d={`M ${x1} ${y1} A 23 23 0 ${largeArc} 1 ${x2} ${y2}`}
                              fill="none" stroke="#25d366" strokeWidth="2.5" strokeLinecap="round"
                            />
                          );
                        })
                      )}
                    </svg>
                  )}
                  <img src={getAvatar(c)} alt="" onError={(e) => handleAvatarError(e, getName(c))} />
                  {isOnline(c) && <span className="online-badge" />}
                </div>
              </div>
              <div className="chat-list-info" onClick={() => { selectConv(c); onSelectChat?.(); }}>
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
          );
        })}
      </div>
      {showNewConv && <NewConversationModal onClose={() => setShowNewConv(false)} />}
      {showGroup && <GroupModal onClose={() => setShowGroup(false)} />}
    </div>
  );
}
