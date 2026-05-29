import { useState, useRef, useEffect } from "react";
import { useChatStore } from "../stores/chatStore.js";
import { useAuthStore } from "../stores/authStore.js";
import { useFeatureStore } from "../stores/featureStore.js";
import { emitTyping, emitStopTyping } from "../stores/socketStore.js";
import { useTranslate } from "../hooks/useTranslate.js";
import { playTyping, playMessageSent } from "../lib/sounds.js";
import { SmilePlus, Send, Paperclip, X, Reply, Mic, Square } from "lucide-react";
import axios from "../lib/axios.js";

const EMOJI_CATEGORIES = [
  {
    name: "Smileys",
    emojis: ["😀","😃","😄","😁","😅","😂","🤣","😊","😇","🙂","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥴","😵","🤯","🤠","🥳","🥺","😢","😭","😤","😠","😡","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖","😺","😸","😹","😻","😼","😽","🙀","😿","😾"],
  },
  {
    name: "Gestures",
    emojis: ["👍","👎","👊","✊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","👇","☝️","✋","🤚","🖐","🖖","👋","🤙","💪","🦾","🖕","✍️","🙏","💅","🤳","💃","🕺"],
  },
  {
    name: "Hearts",
    emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💕","💞","💗","💖","💘","💝","💟","❣️","💔","❤️‍🔥","❤️‍🩹"],
  },
  {
    name: "Objects",
    emojis: ["🔥","⭐","✨","💯","🎉","🎊","🎈","🎁","🎀","🪄","🕯️","💡","🔦","🏆","🥇","🥈","🥉","🏅","🎖️","📚","📖","📝","✏️","🖊️","✂️","📌","📍","🔗","🧷","📎","🖇️","📐","📏"],
  },
  {
    name: "Nature",
    emojis: ["🌞","🌝","🌛","🌜","🌚","🌕","🌖","🌗","🌘","🌑","🌒","🌓","🌔","🌙","🌎","🌍","🌏","🪐","💫","🌟","🌠","🌌","☀️","⛅","🌈","⚡","💧","🌊","🔥","🌸","🌺","🌻","🌹","🌷","🌼","🌿","🍀","🌵","🌴","🌲","🌳"],
  },
  {
    name: "Food",
    emojis: ["🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥝","🍅","🥑","🥦","🥬","🥒","🌽","🥕","🧄","🧅","🥔","🍠","🥐","🍞","🥖","🧀","🥚","🍳","🥓","🥩","🍗","🍖","🌭","🍔","🍟","🍕","🥪","🥙","🧆","🌮","🌯","🥗","🥘","🍝","🍜","🍲","🍛","🍣","🍱","🥟","🦪","🍤","🍙","🍚","🍘","🍥","🥮","🍡","🍧","🍨","🍦","🥧","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪","🥛","🍼","☕","🍵","🧃","🥤","🍺","🍻","🥂","🍷","🥃","🍸","🍹","🧉","🍾"],
  },
  {
    name: "Activities",
    emojis: ["🚀","✈️","🚗","🚌","🚲","🏍️","🚂","🚢","🎸","🎹","🥁","🎤","🎧","🎵","🎶","🎮","🕹️","🎲","♟️","🎯","🎳","⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🏸","🏒","🏑","🥍","🏏","🪃"],
  },
];

export default function MessageInput({ replyTo, onCancelReply }) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(0);
  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const typingTimeoutRef = useRef(null);
  const typingSoundRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const { selectedConversation, sendMessage } = useChatStore();
  const { authUser } = useAuthStore();
  const features = useFeatureStore();
  const t = useTranslate();
  const fileSharingEnabled = features.isEnabled("file_sharing");

  const handleTyping = () => {
    if (!selectedConversation) return;
    emitTyping(selectedConversation.id, authUser.id, authUser.fullName);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping(selectedConversation.id, authUser.id);
    }, 1000);
    if (!typingSoundRef.current) {
      playTyping();
      typingSoundRef.current = setTimeout(() => {
        typingSoundRef.current = null;
      }, 200);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(recordingTimerRef.current);
        setRecordingTime(0);

        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        setFiles((prev) => [...prev, file]);
        setFilePreviews((prev) => [...prev, ""]);
      };

      recorder.start();
      setRecording(true);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch {
      alert("Microphone access denied. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const draftTimerRef = useRef(null);

  useEffect(() => {
    if (selectedConversation) {
      axios.get(`/conversations/${selectedConversation.id}/draft`).then((res) => {
        if (res.data?.text) setText(res.data.text);
      }).catch(() => {});
    }
    return () => {
      clearTimeout(typingTimeoutRef.current);
      clearTimeout(typingSoundRef.current);
      clearInterval(recordingTimerRef.current);
      clearTimeout(draftTimerRef.current);
      if (selectedConversation) {
        emitStopTyping(selectedConversation.id, authUser.id);
        if (text.trim()) {
          axios.put(`/conversations/${selectedConversation.id}/draft`, { text }).catch(() => {});
        }
      }
    };
  }, [selectedConversation?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && files.length === 0) return;
    if (!selectedConversation || sending) return;

    const formData = new FormData();
    formData.append("conversationId", selectedConversation.id);
    formData.append("text", text.trim());
    if (replyTo) formData.append("replyToId", replyTo.id);
    files.forEach((f) => formData.append("files", f));

    if (files.length > 0) {
      const mime = files[0].type;
      if (mime.startsWith("audio/")) formData.append("type", "VOICE_NOTE");
      else if (mime.startsWith("image/")) formData.append("type", "IMAGE");
      else if (mime.startsWith("video/")) formData.append("type", "VIDEO");
      else formData.append("type", "FILE");
    }

    setSending(true);
    await sendMessage(formData);
    setSending(false);
    setText("");
    setFiles([]);
    setFilePreviews([]);
    onCancelReply?.();
    emitStopTyping(selectedConversation.id, authUser.id);
    await axios.delete(`/conversations/${selectedConversation.id}/draft`).catch(() => {});
    playMessageSent();
  };

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    const newFiles = [...files, ...selected];
    setFiles(newFiles);
    const previews = newFiles.map((f) => URL.createObjectURL(f));
    setFilePreviews(previews);
  };

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    const newPreviews = filePreviews.filter((_, i) => i !== index);
    setFilePreviews(newPreviews);
  };

  const addEmoji = (emoji) => {
    setText((prev) => prev + emoji);
    setShowEmoji(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="message-input-container">
      {replyTo && (
        <div className="reply-preview">
          <Reply size={16} />
          <div className="reply-info">
            <span className="reply-name">
              {replyTo.senderId === authUser.id ? "You" : replyTo.sender?.fullName}
            </span>
            <span className="reply-text">{replyTo.text || "Media"}</span>
          </div>
          <button onClick={onCancelReply} className="cancel-reply">
            <X size={18} />
          </button>
        </div>
      )}
      {filePreviews.length > 0 && (
        <div className="file-previews">
          {filePreviews.map((preview, i) => (
            <div key={i} className="file-preview-item">
              {files[i]?.type?.startsWith("image/") ? (
                <img src={preview} alt="" />
              ) : (
                <div className="file-icon">{files[i]?.name?.slice(0, 10)}</div>
              )}
              <button onClick={() => removeFile(i)} className="remove-file">
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
      {showEmoji && (
        <div className="emoji-picker">
          <div className="emoji-categories">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={cat.name}
                className={`emoji-cat-btn ${emojiCategory === i ? "active" : ""}`}
                onClick={() => setEmojiCategory(i)}
                title={cat.name}
              >
                {cat.emojis[0]}
              </button>
            ))}
          </div>
          <div className="emoji-grid">
            {EMOJI_CATEGORIES[emojiCategory].emojis.map((emoji) => (
              <button key={emoji} className="emoji-btn" onClick={() => addEmoji(emoji)}>
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
      <form className="input-form" onSubmit={handleSubmit}>
        {fileSharingEnabled && (
          <button type="button" className="input-action" onClick={() => fileInputRef.current?.click()}>
            <Paperclip size={22} />
          </button>
        )}
        <input type="file" ref={fileInputRef} hidden multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt" onChange={handleFileSelect} />
        <button type="button" className="input-action" onClick={() => setShowEmoji(!showEmoji)}>
          <SmilePlus size={22} />
        </button>
        {recording ? (
          <div className="recording-indicator">
            <span className="recording-dot" />
            <span className="recording-time">{String(Math.floor(recordingTime / 60)).padStart(2, "0")}:{String(recordingTime % 60).padStart(2, "0")}</span>
            <button type="button" className="input-action recording-stop" onClick={stopRecording}>
              <Square size={18} />
            </button>
          </div>
        ) : (
          <button type="button" className="input-action" onClick={startRecording} title="Record voice message">
            <Mic size={22} />
          </button>
        )}
        <textarea
          placeholder={t("chat.typeMessage", "Type a message")}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            handleTyping();
            clearTimeout(draftTimerRef.current);
            draftTimerRef.current = setTimeout(() => {
              if (selectedConversation && e.target.value.trim()) {
                axios.put(`/conversations/${selectedConversation.id}/draft`, { text: e.target.value }).catch(() => {});
              }
            }, 2000);
          }}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          type="submit"
          className="send-btn"
          disabled={(!text.trim() && files.length === 0) || sending}
        >
          {sending ? <span className="send-spinner" /> : <Send size={20} />}
        </button>
      </form>
    </div>
  );
}
