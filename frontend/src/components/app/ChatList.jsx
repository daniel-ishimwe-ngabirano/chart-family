import { useState, useEffect, memo } from "react";
import { useAuthStore } from "../../stores/authStore.js";
import { useChatStore } from "../../stores/chatStore.js";
import { useFeatureStore } from "../../stores/featureStore.js";
import { useStoryStore } from "../../stores/storyStore.js";
import { useTranslate } from "../../hooks/useTranslate.js";
import { Search, UserPlus, MessageSquare, Users, Archive } from "lucide-react";
import NewConversationModal from "../NewConversationModal.jsx";
import GroupModal from "../GroupModal.jsx";
import { handleAvatarError } from "../../utils/avatar.js";

const ChatListItem = memo(function ChatListItem({ conversation, authUser, selectedId, onSelect, onSelectChat, openViewer, groups }) {
  const t = useTranslate();
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const typingUsers = useChatStore((s) => s.typingUsers);
  const isGroup = conversation.isGroup;
  const other = isGroup ? null : conversation.members?.find((m) => m.user?.id !== authUser.id)?.user;
  const otherId = other?.id || null;
  const name = isGroup ? conversation.groupName : other?.fullName || "Unknown";
  const avatar = isGroup ? conversation.groupAvatar : other?.avatar || "";

  const storyMap = {};
  for (const g of groups) {
    if (g.user.id !== authUser?.id) {
      storyMap[g.user.id] = { group: g, count: g.stories.length };
    }
  }
  const storyData = otherId ? storyMap[otherId] : null;
  const storyCount = storyData?.count || 0;

  const online = !isGroup && other ? onlineUsers.has(other.id) : false;

  const typing = typingUsers[conversation.id]?.filter((u) => u.userId !== authUser.id);

  const getLastMsg = () => {
    if (typing?.length > 0) {
      return `✍️ ${typing[0].fullName}${typing.length > 1 ? ` ${t("chat.and", "and")} ${typing.length - 1} ${typing.length > 2 ? t("chat.others", "others") : t("chat.other", "other")}` : ""} ${t("chat.typingLower", "typing...")}`;
    }
    if (!conversation.lastMessage) return t("chat.noMessages", "No messages yet");
    if (conversation.lastMessage.isDeleted) return t("chat.deletedMessagePreview", "Message deleted");
    return conversation.lastMessage.text || (conversation.lastMessage.type === "IMAGE" ? "📷 " + t("common.image", "Image") : conversation.lastMessage.type === "VIDEO" ? "🎥 " + t("common.video", "Video") : t("common.media", "Media"));
  };

  return (
    <div className={`chat-list-item ${selectedId === conversation.id ? "active" : ""}`}>
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
          <img src={avatar} alt="" onError={(e) => handleAvatarError(e, name)} />
          {online && <span className="online-badge" />}
        </div>
      </div>
      <div className="chat-list-info" onClick={() => { onSelect(conversation); onSelectChat?.(); }}>
        <div className="chat-list-top">
          <span className="chat-list-name">{name}</span>
          <span className="chat-list-time">{conversation.lastMessage ? new Date(conversation.lastMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
        </div>
        <div className="chat-list-bottom">
          <span className="chat-list-preview">{getLastMsg()}</span>
          {conversation.unreadCount > 0 && <span className="unread-badge">{conversation.unreadCount}</span>}
        </div>
      </div>
    </div>
  );
});

export default function ChatList({ onSelectChat, groupFilter }) {
  const { authUser } = useAuthStore();
  const conversations = useChatStore((s) => s.conversations);
  const selectedConversation = useChatStore((s) => s.selectedConversation);
  const selectConv = useChatStore((s) => s.setSelectedConversation);
  const users = useChatStore((s) => s.users);
  const getOrCreateConv = useChatStore((s) => s.getOrCreateConversation);
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

  const matchingUsers = search.trim()
    ? users.filter((u) => u.id !== authUser?.id && u.fullName.toLowerCase().includes(search.toLowerCase()))
    : [];

  const filters = [
    { key: "all", label: t("chat.all", "All"), icon: <MessageSquare size={14} /> },
    { key: "unread", label: t("chat.unread", "Unread") },
    { key: "groups", label: t("nav.groups", "Groups"), icon: <Users size={14} /> },
    { key: "archived", label: t("chat.archived", "Archived"), icon: <Archive size={14} /> },
  ];

  const handleStartChat = async (userId) => {
    const conv = await getOrCreateConv(userId);
    if (conv) {
      selectConv(conv);
      onSelectChat?.();
      setSearch("");
    }
  };

  return (
    <div className="chat-list-panel">
      <div className="chat-list-header">
        <h2>{t("nav.chats", "Chats")}</h2>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="icon-btn" onClick={() => setShowNewConv(true)} title={t("chat.newChat", "New chat")}><UserPlus size={20} /></button>
          {groupsEnabled && (
            <button className="icon-btn" onClick={() => setShowGroup(true)} title={t("chat.createGroupBtn", "Create group")}><Users size={20} /></button>
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
        {search.trim() && matchingUsers.length > 0 && filtered.length > 0 && (
          <div className="chat-list-section-label">{t("chat.conversations", "Conversations")}</div>
        )}
        {filtered.map((c) => (
          <ChatListItem
            key={c.id}
            conversation={c}
            authUser={authUser}
            selectedId={selectedConversation?.id}
            onSelect={selectConv}
            onSelectChat={onSelectChat}
            openViewer={openViewer}
            groups={groups}
          />
        ))}
        {search.trim() && matchingUsers.length > 0 && (
          <>
            <div className="chat-list-section-label">{t("chat.people", "People")}</div>
            {matchingUsers.map((user) => (
              <div key={user.id} className="chat-list-item" onClick={() => handleStartChat(user.id)}>
                <div className="chat-list-avatar">
                  <img src={user.avatar || "/avatar-placeholder.png"} alt="" onError={(e) => handleAvatarError(e, user.fullName)} />
                </div>
                <div className="chat-list-info">
                  <div className="chat-list-top">
                    <span className="chat-list-name">{user.fullName}</span>
                  </div>
                  <div className="chat-list-bottom">
                    <span className="chat-list-preview">{t("chat.startNewChat", "Start chat")}</span>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
        {search.trim() && filtered.length === 0 && matchingUsers.length === 0 && (
          <div className="empty-state">{t("chat.noResults", "No results found")}</div>
        )}
      </div>
      {showNewConv && <NewConversationModal onClose={() => setShowNewConv(false)} onSelectChat={onSelectChat} />}
      {showGroup && <GroupModal onClose={() => setShowGroup(false)} />}
    </div>
  );
}
