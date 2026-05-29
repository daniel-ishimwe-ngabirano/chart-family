import { useState, useRef } from "react";
import { useStoryStore } from "../../stores/storyStore.js";
import { X, Image, Type, Loader2 } from "lucide-react";

const BG_COLORS = ["#000000", "#1a1a2e", "#16213e", "#0f3460", "#533483", "#e94560", "#ff6b6b", "#ffa502", "#2ed573", "#1e90ff", "#a29bfe", "#fd79a8"];

export default function StoryCreator({ onClose }) {
  const [mode, setMode] = useState("choose");
  const [text, setText] = useState("");
  const [bgColor, setBgColor] = useState("#000000");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const { createStory } = useStoryStore();

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setMode("preview");
  };

  const handleSubmit = async () => {
    setSending(true);
    try {
      if (mode === "text") {
        await createStory({ caption: text, type: "TEXT", backgroundColor: bgColor, fontStyle: "sans-serif", textColor: "#FFFFFF" });
      } else if (file) {
        const fd = new FormData();
        fd.append("media", file);
        fd.append("caption", text);
        fd.append("type", file.type.startsWith("video/") ? "VIDEO" : "IMAGE");
        await createStory(fd);
      }
      onClose();
    } catch { setSending(false); }
  };

  if (mode === "choose") {
    return (
      <div className="story-creator-overlay" onClick={onClose}>
        <div className="story-creator" onClick={(e) => e.stopPropagation()}>
          <div className="story-creator-header">
            <h3>New Story</h3>
            <button onClick={onClose}><X size={20} /></button>
          </div>
          <div className="story-creator-options">
            <button className="story-option-btn" onClick={() => { setMode("text"); setText(""); }}>
              <Type size={32} />
              <span>Text</span>
            </button>
            <button className="story-option-btn" onClick={() => fileInputRef.current?.click()}>
              <Image size={32} />
              <span>Photo/Video</span>
            </button>
          </div>
          <input type="file" ref={fileInputRef} hidden accept="image/*,video/*" onChange={handleFileSelect} />
        </div>
      </div>
    );
  }

  const isText = mode === "text";
  return (
    <div className="story-creator-overlay" onClick={isText ? undefined : onClose}>
      <div className={`story-preview ${isText ? "text-mode" : "media-mode"}`} style={{ backgroundColor: isText ? bgColor : undefined }} onClick={(e) => e.stopPropagation()}>
        <button className="story-preview-close" onClick={onClose}><X size={22} /></button>

        {isText ? (
          <div className="story-text-content">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 200))}
              placeholder="Type your status..."
              className="story-text-input"
              maxLength={200}
              autoFocus
            />
            <div className="story-color-picker">
              {BG_COLORS.map((c) => (
                <button key={c} className={`color-dot ${c === bgColor ? "active" : ""}`} style={{ backgroundColor: c }} onClick={() => setBgColor(c)} />
              ))}
            </div>
          </div>
        ) : (
          <div className="story-media-content">
            {file?.type?.startsWith("video/") ? (
              <video src={preview} autoPlay loop muted className="story-preview-media" />
            ) : (
              <img src={preview} alt="" className="story-preview-media" />
            )}
            <input
              className="story-caption-input"
              placeholder="Add a caption..."
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 100))}
              maxLength={100}
            />
          </div>
        )}

        <button className="story-send-btn" disabled={sending || (isText && !text.trim())} onClick={handleSubmit}>
          {sending ? <Loader2 size={22} className="spin" /> : "Share"}
        </button>
      </div>
    </div>
  );
}
