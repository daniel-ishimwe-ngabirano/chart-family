import { useState, useEffect, useRef } from "react";
import { useChatStore } from "../stores/chatStore.js";
import { useAuthStore } from "../stores/authStore.js";
import { joinConversation, leaveConversation, emitMarkAsRead } from "../stores/socketStore.js";
import MessageInput from "./MessageInput.jsx";
import MessageBubble from "./MessageBubble.jsx";
import { ArrowLeft, Info, Loader2 } from "lucide-react";

export default function ChatWindow() {
  const {
    selectedConversation,
    messages,
    isMessagesLoading,
    getMessages,
    setSelectedConversation,
    onlineUsers,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messagesEndRef = useRef(null);
  const [replyTo, setReplyTo] = useState(null);

  useEffect(() => {
    if (selectedConversation) {
      getMessages(selectedConversation.id);
      joinConversation(selectedConversation.id);
      return () => {
        leaveConversation(selectedConversation.id);
      };
    }
  }, [selectedConversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      const unreadMessages = messages.filter(
        (m) =>
          m.senderId !== authUser.id &&
          !m.readReceipts?.some((r) => r.userId === authUser.id)
      );
      unreadMessages.forEach((m) => {
        emitMarkAsRead(selectedConversation.id, m.id, authUser.id);
      });
    }
  }, [messages, selectedConversation]);

  if (!selectedConversation) {
    return (
      <div className="chat-empty">
        <div className="empty-content">
          <h2>WaveChat</h2>
          <p>Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  const getOtherUser = () => {
    if (selectedConversation?.isGroup) return null;
    return selectedConversation?.members?.find((m) => m.user.id !== authUser.id)?.user;
  };

  const otherUser = getOtherUser();
  const isOnline = otherUser ? onlineUsers.has(otherUser.id) : false;

  const getHeaderName = () => {
    if (selectedConversation?.isGroup) return selectedConversation.groupName;
    return otherUser?.fullName || "Unknown";
  };

  const getHeaderAvatar = () => {
    if (selectedConversation?.isGroup) return selectedConversation.groupAvatar;
    return otherUser?.avatar || "";
  };

  const getHeaderStatus = () => {
    if (selectedConversation?.isGroup) return `${selectedConversation.members?.length || 0} members`;
    if (isOnline) return "Online";
    if (otherUser?.lastSeen) {
      const date = new Date(otherUser.lastSeen);
      const now = new Date();
      const diff = now - date;
      if (diff < 60000) return "Last seen just now";
      if (diff < 3600000) return `Last seen ${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `Last seen ${Math.floor(diff / 3600000)}h ago`;
      return `Last seen ${date.toLocaleDateString()}`;
    }
    return "Offline";
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <button className="mobile-back" onClick={() => setSelectedConversation(null)}>
          <ArrowLeft size={24} />
        </button>
        <img src={getHeaderAvatar()} alt="" className="avatar" />
        <div className="chat-header-info">
          <div className="chat-header-name">{getHeaderName()}</div>
          <div className="chat-header-status">{getHeaderStatus()}</div>
        </div>
        <button className="header-action">
          <Info size={22} />
        </button>
      </div>

      <div className="messages-container">
        {isMessagesLoading ? (
          <div className="loading-center">
            <Loader2 size={32} className="spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-chat">
            <p>No messages yet</p>
            <p className="hint">Send a message to start the conversation</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.senderId === authUser.id}
              onReply={setReplyTo}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
    </div>
  );
}
