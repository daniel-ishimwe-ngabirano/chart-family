import { useState, useEffect, useRef, useCallback } from "react";
import { useChatStore } from "../../stores/chatStore.js";
import { useAuthStore } from "../../stores/authStore.js";
import { useFeatureStore } from "../../stores/featureStore.js";
import { useCallStore } from "../../stores/callStore.js";
import { useStoryStore } from "../../stores/storyStore.js";
import { useTranslate } from "../../hooks/useTranslate.js";
import { joinConversation, leaveConversation, emitMarkAsRead } from "../../stores/socketStore.js";
import MessageInput from "../MessageInput.jsx";
import MessageBubble from "../MessageBubble.jsx";
import { ArrowLeft, Info, Phone, Video, Loader2, Search, X, Pin, BarChart3, Plus } from "lucide-react";
import { handleAvatarError } from "../../utils/avatar.js";
import axios from "../../lib/axios.js";
import PollModal from "../PollModal.jsx";

export default function MainChat({ onTogglePanel, onBack, onOpenStoryCreator }) {
  const { selectedConversation, messages, isMessagesLoading, isLoadingMore, nextCursor, getMessages, onlineUsers, typingUsers } = useChatStore();
  const { authUser } = useAuthStore();
  const t = useTranslate();
  const features = useFeatureStore();
  const { startCall } = useCallStore();
  const { groups, openViewer } = useStoryStore();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [replyTo, setReplyTo] = useState(null);
  const prevMessageCountRef = useRef(0);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef(null);
  const [showPoll, setShowPoll] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);

  const doSearch = useCallback(async (q) => {
    if (!q.trim() || !selectedConversation) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await axios.get(`/conversations/${selectedConversation.id}/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res.data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [selectedConversation]);

  useEffect(() => {
    if (selectedConversation) {
      getMessages(selectedConversation.id);
      joinConversation(selectedConversation.id);
      axios.post(`/conversations/${selectedConversation.id}/read`).catch(() => {});
      prevMessageCountRef.current = 0;
      setShowSearch(false);
      setSearchQuery("");
      setSearchResults([]);
      axios.get(`/conversations/${selectedConversation.id}/pinned`).then((res) => {
        setPinnedMessages(res.data || []);
      }).catch(() => {});
      return () => leaveConversation(selectedConversation.id);
    }
  }, [selectedConversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || isLoadingMore || !nextCursor) return;
    if (container.scrollTop < 100) {
      const prevHeight = container.scrollHeight;
      getMessages(selectedConversation.id, nextCursor).then(() => {
        requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight - prevHeight;
        });
      });
    }
  }, [isLoadingMore, nextCursor, selectedConversation?.id, getMessages]);

  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      messages.filter((m) => m.senderId !== authUser.id && !m.readReceipts?.some((r) => r.userId === authUser.id))
        .forEach((m) => emitMarkAsRead(selectedConversation.id, m.id, authUser.id));
    }
  }, [messages, selectedConversation]);

  if (!selectedConversation) {
    return (
      <div className="main-chat empty">
        <div className="empty-content">
          <h2>WaveChat</h2>
          <p>{t("chat.selectConversation", "Select a conversation to start messaging")}</p>
        </div>
      </div>
    );
  }

  const otherUser = selectedConversation?.isGroup ? null : selectedConversation?.members?.find((m) => m.user?.id !== authUser.id)?.user;
  const isOnline = otherUser ? onlineUsers.has(otherUser.id) : false;
  const voiceCallsEnabled = features.isEnabled("voice_calls");
  const videoCallsEnabled = features.isEnabled("video_calls");
  const storiesEnabled = features.isEnabled("stories_enabled");
  const otherUserStory = otherUser && storiesEnabled ? groups.find((g) => g.user.id === otherUser.id) : null;
  const hasStory = otherUserStory && otherUserStory.stories.length > 0;
  const handleVoiceCall = () => {
    if (!otherUser || !selectedConversation) return;
    startCall(otherUser, "VOICE", selectedConversation.id);
  };
  const handleVideoCall = () => {
    if (!otherUser || !selectedConversation) return;
    startCall(otherUser, "VIDEO", selectedConversation.id);
  };
  const typingList = selectedConversation ? (typingUsers[selectedConversation.id] || []).filter((u) => u.userId !== authUser.id) : [];
  const typingText = typingList.length === 1
    ? `${typingList[0].fullName} is typing...`
    : typingList.length > 1
      ? `${typingList[0].fullName} and ${typingList.length - 1} other${typingList.length > 2 ? "s" : ""} are typing...`
      : null;

  return (
    <div className="main-chat">
      <div className="main-chat-header">
        <button className="mobile-back" onClick={() => { useChatStore.getState().setSelectedConversation(null); onBack?.(); }}>
          <ArrowLeft size={24} />
        </button>
        <img src={otherUser?.avatar || selectedConversation?.groupAvatar || ""} alt="" className="chat-header-avatar" onError={(e) => handleAvatarError(e, selectedConversation?.isGroup ? selectedConversation.groupName : otherUser?.fullName || "Unknown")} />
        <div className="chat-header-info">
          <div className="chat-header-name">{selectedConversation?.isGroup ? selectedConversation.groupName : otherUser?.fullName || "Unknown"}</div>
          <div className="chat-header-status">
            {selectedConversation?.isGroup ? `${selectedConversation.members?.length || 0} members` : isOnline ? "Online" : otherUser?.lastSeen ? `Last seen ${new Date(otherUser.lastSeen).toLocaleTimeString()}` : "Offline"}
          </div>
        </div>
        <div className="chat-header-actions">
          {voiceCallsEnabled && <button className="icon-btn" title="Voice call" onClick={handleVoiceCall}><Phone size={20} /></button>}
          {videoCallsEnabled && <button className="icon-btn" title="Video call" onClick={handleVideoCall}><Video size={20} /></button>}
          {hasStory && (
            <button className="icon-btn status-header-btn" title="View status" onClick={() => openViewer(otherUser.id, 0)}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="var(--accent)" strokeWidth="2" />
                <circle cx="12" cy="12" r="6" fill="var(--accent)" stroke="none" />
              </svg>
            </button>
          )}
          {selectedConversation?.isGroup && features.isEnabled("polls_enabled") && (
            <button className="icon-btn" title="Create poll" onClick={() => setShowPoll(true)}><BarChart3 size={20} /></button>
          )}
          <button className="icon-btn" title="Search" onClick={() => { setShowSearch(!showSearch); if (!showSearch) setTimeout(() => searchInputRef.current?.focus(), 100); }}><Search size={20} /></button>
          <button className="icon-btn" onClick={onTogglePanel} title="Info"><Info size={20} /></button>
        </div>
      </div>
      {storiesEnabled && groups.length > 0 && (
        <div className="mainchat-stories">
          <div className="mainchat-stories-header">
            <span>Status</span>
            <button className="icon-btn" title="Add status" onClick={() => onOpenStoryCreator?.()}>
              <Plus size={16} />
            </button>
          </div>
          <div className="mainchat-stories-list">
            {groups.map((group) => {
              const hasUnviewed = group.stories.some((s) => !s.viewed);
              const isMe = group.user.id === authUser.id;
              const label = isMe ? "You" : group.user.fullName.split(" ")[0];
              return (
                <div key={group.user.id} className="mainchat-story-item" onClick={() => openViewer(group.user.id, 0)}>
                  <div className={`story-avatar-ring ${hasUnviewed ? "unviewed" : "viewed"}`}>
                    <div className="story-avatar-img-wrap">
                      <img src={group.user.avatar || ""} alt="" onError={(e) => handleAvatarError(e, group.user.fullName)} />
                    </div>
                  </div>
                  <div className="mainchat-story-info">
                    <span className="mainchat-story-name">{label}</span>
                    <span className="mainchat-story-meta">{group.stories.length} story{group.stories.length > 1 ? "ies" : "y"}</span>
                  </div>
                  {!hasUnviewed && <span className="mainchat-story-seen">Seen</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {pinnedMessages.length > 0 && (
        <div className="pinned-messages-bar">
          <Pin size={14} />
          <span className="pinned-count">{pinnedMessages.length} pinned</span>
          <span className="pinned-preview">{pinnedMessages[0]?.message?.text || "Media"}</span>
          {pinnedMessages.length > 1 && <span className="pinned-more">+{pinnedMessages.length - 1} more</span>}
        </div>
      )}
      {showSearch && (
        <div className="chat-search-bar">
          <Search size={16} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); doSearch(e.target.value); }}
          />
          <button className="icon-btn" onClick={() => { setShowSearch(false); setSearchQuery(""); setSearchResults([]); }}><X size={16} /></button>
        </div>
      )}
      {showSearch && searchQuery && (
        <div className="chat-search-results">
          {searching ? (
            <div className="loading-center"><Loader2 size={16} className="spin" /></div>
          ) : searchResults.length === 0 ? (
            <div className="search-no-results">No messages found</div>
          ) : (
            searchResults.slice(0, 10).map((msg) => (
              <div key={msg.id} className="search-result-item" onClick={() => { setShowSearch(false); }}>
                <div className="search-result-sender">{msg.sender?.fullName || "Unknown"}</div>
                <div className="search-result-text">{msg.text}</div>
              </div>
            ))
          )}
        </div>
      )}
      <div className="main-chat-messages" ref={messagesContainerRef} onScroll={handleScroll}>
        {isMessagesLoading ? (
          <div className="loading-center"><Loader2 size={32} className="spin" /></div>
        ) : (
          <>
            {isLoadingMore && (
              <div className="loading-more"><Loader2 size={20} className="spin" /></div>
            )}
            {messages.length === 0 ? (
              <div className="empty-chat"><p>No messages yet</p><p className="hint">Send a message to start</p></div>
            ) : (
              messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} isOwn={msg.senderId === authUser.id} onReply={setReplyTo} />
              ))
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      {typingText && (
        <div className="typing-indicator">
          <span className="typing-dots"><span /><span /><span /></span>
          <span className="typing-text">{typingText}</span>
        </div>
      )}
      <MessageInput replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
      {showPoll && <PollModal conversationId={selectedConversation.id} onClose={() => setShowPoll(false)} />}
    </div>
  );
}
