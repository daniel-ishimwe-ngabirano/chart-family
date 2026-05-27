import { useState, useEffect, useRef, useCallback } from "react";
import { useChatStore } from "../../stores/chatStore.js";
import { useAuthStore } from "../../stores/authStore.js";
import { useFeatureStore } from "../../stores/featureStore.js";
import { useCallStore } from "../../stores/callStore.js";
import { useTranslate } from "../../hooks/useTranslate.js";
import { joinConversation, leaveConversation, emitMarkAsRead } from "../../stores/socketStore.js";
import MessageInput from "../MessageInput.jsx";
import MessageBubble from "../MessageBubble.jsx";
import { ArrowLeft, Info, Phone, Video, Loader2, Search, MoreVertical } from "lucide-react";
import { handleAvatarError } from "../../utils/avatar.js";

export default function MainChat({ onTogglePanel, onBack }) {
  const { selectedConversation, messages, isMessagesLoading, isLoadingMore, nextCursor, getMessages, onlineUsers, typingUsers } = useChatStore();
  const { authUser } = useAuthStore();
  const t = useTranslate();
  const features = useFeatureStore();
  const { startCall } = useCallStore();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [replyTo, setReplyTo] = useState(null);
  const prevMessageCountRef = useRef(0);

  useEffect(() => {
    if (selectedConversation) {
      getMessages(selectedConversation.id);
      joinConversation(selectedConversation.id);
      prevMessageCountRef.current = 0;
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
          <button className="icon-btn" onClick={onTogglePanel} title="Info"><Info size={20} /></button>
        </div>
      </div>
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
    </div>
  );
}
