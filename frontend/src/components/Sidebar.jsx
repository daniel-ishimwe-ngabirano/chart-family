import { useState, useRef } from "react";
import { useAuthStore } from "../stores/authStore.js";
import { useChatStore } from "../stores/chatStore.js";
import { Search, MessageSquare, LogOut, Settings, UserPlus, Users, Shield } from "lucide-react";
import ProfileModal from "./ProfileModal.jsx";
import GroupModal from "./GroupModal.jsx";
import AdminPanel from "./AdminPanel.jsx";

export default function Sidebar() {
  const { authUser, logout } = useAuthStore();
  const {
    conversations,
    users,
    selectedConversation,
    setSelectedConversation,
    getOrCreateConversation,
    getConversations,
    onlineUsers,
  } = useChatStore();

  const [showProfile, setShowProfile] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  const [search, setSearch] = useState("");
  const [showUsers, setShowUsers] = useState(false);
  const searchRef = useRef();

  const filteredConversations = conversations.filter((conv) => {
    if (conv.isGroup) {
      return conv.groupName?.toLowerCase().includes(search.toLowerCase());
    }
    const otherUser = conv.members?.find((m) => m.user.id !== authUser.id)?.user;
    return otherUser?.fullName?.toLowerCase().includes(search.toLowerCase());
  });

  const filteredUsers = users.filter(
    (u) => u.fullName.toLowerCase().includes(search.toLowerCase()) && u.id !== authUser.id
  );

  const handleSelectUser = async (userId) => {
    const conv = await getOrCreateConversation(userId);
    if (conv) {
      setSelectedConversation(conv);
      setShowUsers(false);
      setSearch("");
    }
  };

  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
  };

  const getConversationName = (conv) => {
    if (conv.isGroup) return conv.groupName;
    const otherUser = conv.members?.find((m) => m.user.id !== authUser.id)?.user;
    return otherUser?.fullName || "Unknown";
  };

  const getConversationAvatar = (conv) => {
    if (conv.isGroup) return conv.groupAvatar;
    const otherUser = conv.members?.find((m) => m.user.id !== authUser.id)?.user;
    return otherUser?.avatar || "";
  };

  const isUserOnline = (conv) => {
    if (conv.isGroup) return false;
    const otherUser = conv.members?.find((m) => m.user.id !== authUser.id)?.user;
    return otherUser ? onlineUsers.has(otherUser.id) : false;
  };

  const getLastMessagePreview = (conv) => {
    if (!conv.lastMessage) return "No messages yet";
    if (conv.lastMessage.isDeleted) return "Message deleted";
    return conv.lastMessage.text || (conv.lastMessage.type === "IMAGE" ? "Image" : conv.lastMessage.type === "VIDEO" ? "Video" : "Media");
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="user-info" onClick={() => setShowProfile(true)}>
          <img src={authUser?.avatar} alt="" className="avatar" />
          <span className="user-name">{authUser?.fullName}</span>
        </div>
        <div className="sidebar-actions">
          <button onClick={() => { setShowUsers(!showUsers); setSearch(""); }} title="New chat">
            <MessageSquare size={20} />
          </button>
          <button onClick={() => setShowGroup(true)} title="New group">
            <Users size={20} />
          </button>
          {authUser?.role === "admin" && (
            <button onClick={() => setShowAdmin(true)} title="Admin">
              <Shield size={20} />
            </button>
          )}
          <button onClick={() => setShowProfile(true)} title="Settings">
            <Settings size={20} />
          </button>
          <button onClick={logout} title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </div>
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showGroup && <GroupModal onClose={() => setShowGroup(false)} />}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}

      <div className="search-bar">
        <Search size={18} />
        <input
          ref={searchRef}
          type="text"
          placeholder={showUsers ? "Search users..." : "Search or start new chat"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="conversations-list">
        {showUsers ? (
          <>
            <div className="section-title">
              <UserPlus size={16} />
              <span>New Conversation</span>
            </div>
            {filteredUsers.length === 0 ? (
              <div className="empty-state">No users found</div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="conversation-item"
                  onClick={() => handleSelectUser(user.id)}
                >
                  <div className="avatar-wrapper">
                    <img src={user.avatar} alt="" className="avatar" />
                    {onlineUsers.has(user.id) && <span className="online-dot" />}
                  </div>
                  <div className="conversation-info">
                    <div className="conversation-name">{user.fullName}</div>
                    <div className="last-message">{user.bio || "Hey there!"}</div>
                  </div>
                </div>
              ))
            )}
          </>
        ) : (
          <>
            {filteredConversations.length === 0 ? (
              <div className="empty-state">
                <MessageSquare size={48} />
                <p>No conversations yet</p>
                <p className="hint">Search for users to start chatting</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`conversation-item ${selectedConversation?.id === conv.id ? "active" : ""}`}
                  onClick={() => handleSelectConversation(conv)}
                >
                  <div className="avatar-wrapper">
                    <img src={getConversationAvatar(conv)} alt="" className="avatar" />
                    {isUserOnline(conv) && <span className="online-dot" />}
                  </div>
                  <div className="conversation-info">
                    <div className="conversation-name">
                      {getConversationName(conv)}
                      {conv.isGroup && <span className="group-badge">Group</span>}
                    </div>
                    <div className="last-message">{getLastMessagePreview(conv)}</div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
