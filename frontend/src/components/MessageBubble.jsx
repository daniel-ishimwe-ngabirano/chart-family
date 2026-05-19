import { useState } from "react";
import { useChatStore } from "../stores/chatStore.js";
import { useAuthStore } from "../stores/authStore.js";
import { MoreVertical, Reply, Pencil, Trash2, SmilePlus, Check, CheckCheck, Forward, Image } from "lucide-react";
import MediaViewer from "./MediaViewer.jsx";
import ForwardModal from "./ForwardModal.jsx";

const EMOJI_REACTIONS = ["❤️", "😂", "👍", "😮", "😢", "🙏"];

export default function MessageBubble({ message, isOwn, onReply }) {
  const { deleteMessage, editMessage, reactToMessage } = useChatStore();
  const { authUser } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [showMedia, setShowMedia] = useState(false);
  const [showForward, setShowForward] = useState(false);

  if (message.isDeleted || message.deletedForEveryone) {
    return (
      <div className={`message-bubble ${isOwn ? "own" : "other"} deleted`}>
        <div className="message-text deleted-text">
          {message.deletedForEveryone ? "This message was deleted" : "You deleted this message"}
        </div>
      </div>
    );
  }

  const handleDelete = (forEveryone) => {
    deleteMessage(message.id, forEveryone);
    setShowMenu(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditText(message.text);
    setShowMenu(false);
  };

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== message.text) {
      editMessage(message.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleReact = (emoji) => {
    reactToMessage(message.id, emoji);
    setShowReactions(false);
  };

  const userReaction = message.reactions?.find(
    (r) => r.userId === authUser.id
  );

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const attachments = message.attachments || [];

  return (
    <div className={`message-wrapper ${isOwn ? "own" : "other"}`}>
      {message.replyTo && (
        <div className="replied-message">
          <div className="replied-sender">{message.replyTo.sender?.fullName}</div>
          <div className="replied-text">{message.replyTo.text || "Media"}</div>
        </div>
      )}

      {attachments.length > 0 && attachments[0].mimeType?.startsWith("image/") && (
        <div className="message-image" onClick={() => setShowMedia(true)}>
          <img src={attachments[0].url} alt="" />
        </div>
      )}

      {attachments.length > 0 && attachments[0].mimeType?.startsWith("audio/") && (
        <div className="message-audio">
          <audio src={attachments[0].url} controls preload="metadata" />
        </div>
      )}

      {attachments.length > 0 && attachments[0].mimeType?.startsWith("video/") && (
        <div className="message-video" onClick={() => setShowMedia(true)}>
          <video src={attachments[0].url} controls preload="metadata" />
        </div>
      )}

      <div
        className={`message-bubble ${isOwn ? "own" : "other"}`}
        onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
      >
        {isEditing ? (
          <div className="edit-input">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              autoFocus
            />
            <div className="edit-actions">
              <button onClick={() => setIsEditing(false)}>Cancel</button>
              <button onClick={handleSaveEdit}>Save</button>
            </div>
          </div>
        ) : (
          <>
            <div className="message-text">{message.text}</div>
            {message.isEdited && <span className="edited-badge">edited</span>}
            <div className="message-meta">
              <span className="message-time">{time}</span>
              {isOwn && (
                <span className="message-status">
                  {message.readReceipts?.length > 1 ? (
                    <CheckCheck size={14} className="read" />
                  ) : (
                    <Check size={14} />
                  )}
                </span>
              )}
            </div>
          </>
        )}

        {showMenu && (
          <div className="message-menu" onClick={() => setShowMenu(false)}>
            <div className="menu-backdrop" onClick={() => setShowMenu(false)} />
            <div className="menu-content">
              <button onClick={() => { onReply(message); setShowMenu(false); }}>
                <Reply size={16} /> Reply
              </button>
              <button onClick={() => { setShowForward(true); setShowMenu(false); }}>
                <Forward size={16} /> Forward
              </button>
              {isOwn && (
                <button onClick={handleEdit}>
                  <Pencil size={16} /> Edit
                </button>
              )}
              {isOwn && (
                <>
                  <button onClick={() => handleDelete(false)}>
                    <Trash2 size={16} /> Delete for me
                  </button>
                  <button onClick={() => handleDelete(true)}>
                    <Trash2 size={16} /> Delete for everyone
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {message.reactions && message.reactions.length > 0 && (
        <div className="message-reactions" onClick={() => setShowReactions(!showReactions)}>
          {message.reactions.map((r, i) => (
            <span key={i} className="reaction-emoji">{r.emoji}</span>
          ))}
        </div>
      )}

      {showReactions && (
        <div className="reaction-picker">
          {EMOJI_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              className={`reaction-btn ${userReaction?.emoji === emoji ? "active" : ""}`}
              onClick={() => handleReact(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {!isOwn && (
        <button className="react-trigger" onClick={() => setShowReactions(!showReactions)}>
          <SmilePlus size={14} />
        </button>
      )}
      {showMedia && <MediaViewer url={attachments[0]?.url} mimeType={attachments[0]?.mimeType} onClose={() => setShowMedia(false)} />}
      {showForward && <ForwardModal message={message} onClose={() => setShowForward(false)} />}
    </div>
  );
}
