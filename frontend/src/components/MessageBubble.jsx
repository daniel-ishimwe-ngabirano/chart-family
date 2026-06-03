import { useState, useRef, useEffect } from "react";
import { useChatStore } from "../stores/chatStore.js";
import { useAuthStore } from "../stores/authStore.js";
import { useTranslate } from "../hooks/useTranslate.js";
import { emitPinMessage } from "../stores/socketStore.js";
import { MoreVertical, Reply, Pencil, Trash2, SmilePlus, Check, CheckCheck, Forward, Image, Pin } from "lucide-react";
import MediaViewer from "./MediaViewer.jsx";
import ForwardModal from "./ForwardModal.jsx";
import VoicePlayer from "./VoicePlayer.jsx";

const EMOJI_REACTIONS = ["❤️", "😂", "👍", "😮", "😢", "🙏", "🔥", "🎉", "😍", "💯", "✨", "😭", "🤣", "🥰", "😘", "💀", "👏", "🙌", "😤", "🤔"];

export default function MessageBubble({ message, isOwn, onReply }) {
  const { deleteMessage, editMessage, reactToMessage } = useChatStore();
  const { authUser } = useAuthStore();
  const t = useTranslate();
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [showMedia, setShowMedia] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [showForward, setShowForward] = useState(false);
  const reactionRef = useRef(null);

  useEffect(() => {
    if (!showReactions) return;
    const handleClickOutside = (e) => {
      if (reactionRef.current && !reactionRef.current.contains(e.target)) {
        setShowReactions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showReactions]);

  if (message.isDeleted || message.deletedForEveryone) {
    return (
      <div className={`message-bubble ${isOwn ? "own" : "other"} deleted`}>
        <div className="message-text deleted-text">
          {message.deletedForEveryone ? t("chat.deletedMessage", "This message was deleted") : t("chat.youDeleted", "You deleted this message")}
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
  };

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const attachments = message.attachments || [];
  const imageAttachments = attachments.filter((a) => a.mimeType?.startsWith("image/"));
  const videoAttachments = attachments.filter((a) => a.mimeType?.startsWith("video/"));
  const audioAttachments = attachments.filter((a) => a.mimeType?.startsWith("audio/"));
  const isAudioAttachment = audioAttachments.length > 0 || message.type === "VOICE_NOTE";

  const hasMixedAttachments = imageAttachments.length > 0 && (videoAttachments.length > 0 || audioAttachments.length > 0);

  const openMedia = (attIndex) => {
    setMediaIndex(attIndex);
    setShowMedia(true);
  };

  const groupedReactions = (message.reactions || []).reduce((acc, r) => {
    const existing = acc.find((g) => g.emoji === r.emoji);
    if (existing) {
      existing.count++;
      existing.users.push(r.userId);
    } else {
      acc.push({ emoji: r.emoji, count: 1, users: [r.userId] });
    }
    return acc;
  }, []);

  const renderImageGrid = () => {
    if (imageAttachments.length === 0) return null;
    const count = imageAttachments.length;
    let gridClass = "message-image-grid";
    if (count === 2) gridClass += " two";
    else if (count <= 4) gridClass += " four";
    else gridClass += " many";

    const displayImages = imageAttachments.slice(0, 5);

    return (
      <div className={gridClass}>
        {displayImages.map((att, i) => {
          const fullIdx = attachments.indexOf(att);
          return (
            <div key={att.id || i} className="image-grid-item" onClick={() => openMedia(fullIdx)}>
              <img src={att.url} alt="" loading="lazy" />
              {count > 5 && i === 4 && (
                <div className="image-grid-overlay">+{count - 5}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderVideoAttachments = () =>
    videoAttachments.map((att) => {
      const fullIdx = attachments.indexOf(att);
      return (
        <div key={att.id} className="message-video" onClick={() => openMedia(fullIdx)}>
          <video
            src={att.url}
            poster={att.thumbnail}
            preload="metadata"
          />
          <div className="video-play-overlay">
            <div className="play-button">▶</div>
            {att.duration && (
              <div className="video-duration">
                {Math.floor(att.duration / 60)}:{String(att.duration % 60).padStart(2, '0')}
              </div>
            )}
          </div>
        </div>
      );
    });

  const renderAudioAttachments = () => {
    if (!isAudioAttachment) return null;
    return audioAttachments.map((att) => (
      <div key={att.id} className="message-audio">
        <VoicePlayer src={att.url} isOwn={isOwn} />
      </div>
    ));
  };

  return (
    <div className={`message-wrapper ${isOwn ? "own" : "other"}`}>
      {message.replyTo && (
        <div className="replied-message">
          <div className="replied-sender">{message.replyTo.sender?.fullName}</div>
          <div className="replied-text">{message.replyTo.text || t("common.media", "Media")}</div>
        </div>
      )}

      {hasMixedAttachments || imageAttachments.length > 1
        ? renderImageGrid()
        : imageAttachments.length === 1 && (
            <div className="message-image" onClick={() => openMedia(attachments.indexOf(imageAttachments[0]))}>
              <img src={imageAttachments[0].url} alt="" />
            </div>
          )}

      {renderVideoAttachments()}
      {renderAudioAttachments()}

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
              <button onClick={() => setIsEditing(false)}>{t("common.cancel", "Cancel")}</button>
              <button onClick={handleSaveEdit}>{t("common.save", "Save")}</button>
            </div>
          </div>
        ) : (
          <>
            <div className="message-text">{message.text}</div>
            {message.isEdited && <span className="edited-badge">{t("chat.edited", "edited")}</span>}
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
                <Reply size={16} /> {t("chat.reply", "Reply")}
              </button>
              <button onClick={() => { setShowForward(true); setShowMenu(false); }}>
                <Forward size={16} /> {t("chat.forward", "Forward")}
              </button>
              <button onClick={() => { emitPinMessage(message.conversationId, message.id); setShowMenu(false); }}>
                <Pin size={16} /> {t("chat.pin", "Pin")}
              </button>
              {isOwn && (
                <button onClick={handleEdit}>
                  <Pencil size={16} /> {t("chat.edit", "Edit")}
                </button>
              )}
              {isOwn && (
                <>
                  <button onClick={() => handleDelete(false)}>
                    <Trash2 size={16} /> {t("chat.deleteForMe", "Delete for me")}
                  </button>
                  <button onClick={() => handleDelete(true)}>
                    <Trash2 size={16} /> {t("chat.deleteForEveryone", "Delete for everyone")}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {groupedReactions.length > 0 && (
        <div className="message-reactions" onClick={() => setShowReactions(!showReactions)}>
          {groupedReactions.map((g) => {
            const hasReacted = g.users.includes(authUser.id);
            return (
              <span key={g.emoji} className={`reaction-emoji ${hasReacted ? "reacted" : ""}`}>
                {g.emoji} {g.count > 1 && <span className="reaction-count">{g.count}</span>}
              </span>
            );
          })}
        </div>
      )}

      {showReactions && (
        <div className="reaction-picker" ref={reactionRef}>
          {EMOJI_REACTIONS.map((emoji) => {
            const hasReacted = (message.reactions || []).some((r) => r.emoji === emoji && r.userId === authUser.id);
            return (
              <button
                key={emoji}
                className={`reaction-btn ${hasReacted ? "active" : ""}`}
                onClick={() => handleReact(emoji)}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      )}

      {!isOwn && (
        <button className="react-trigger" onClick={() => setShowReactions(!showReactions)}>
          <SmilePlus size={14} />
        </button>
      )}
      {showMedia && (
        <MediaViewer
          attachments={attachments}
          initialIndex={mediaIndex}
          onClose={() => setShowMedia(false)}
        />
      )}
      {showForward && <ForwardModal message={message} onClose={() => setShowForward(false)} />}
    </div>
  );
}
