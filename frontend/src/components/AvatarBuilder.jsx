import { useState } from "react";
import { useAuthStore } from "../stores/authStore.js";
import { X, Check, RotateCw } from "lucide-react";

function randomSeed() { return Math.random().toString(36).slice(2, 10); }

const STYLES = {
  avataaars: {
    label: "Avatar",
    desc: "Cartoon face",
    seedable: ["skinColor", "top", "accessories", "clothes", "mouth", "eyebrows", "eyes", "facialHair", "hairColor"],
  },
  adventurer: {
    label: "Adventurer",
    desc: "Game character",
    seedable: ["skinColor", "hair", "accessories"],
  },
  lorelei: {
    label: "Lorelei",
    desc: "Modern illustration",
    seedable: ["skinColor", "hair", "accessories"],
  },
  notionists: {
    label: "Notionists",
    desc: "Minimalist figure",
    seedable: ["skinColor", "hair", "accessories"],
  },
  micah: {
    label: "Micah",
    desc: "Hand-drawn style",
    seedable: ["skinColor", "hair", "accessories"],
  },
  openPeeps: {
    label: "Open Peeps",
    desc: "Hand-drawn figure",
    seedable: ["skinColor", "hair", "accessories"],
  },
  bottts: {
    label: "Bottts",
    desc: "Robot character",
    seedable: ["primaryColor", "secondaryColor", "texture", "mouth"],
  },
  identicon: {
    label: "Identicon",
    desc: "Geometric pattern",
    seedable: [],
  },
  initials: {
    label: "Initials",
    desc: "Name initials",
    seedable: [],
  },
};

const COLOR_OPTIONS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9", "#F0B27A", "#82E0AA", "#F1948A", "#85929E", "#73C6B6"];

function styleKey(k) {
  if (k === "openPeeps") return "open-peeps";
  return k;
}

function buildUrl(styleName, opts, seed) {
  const params = new URLSearchParams({ seed: seed || "User" });
  Object.entries(opts).forEach(([k, v]) => {
    if (v && v !== "transparent") params.set(k, v.startsWith("#") ? v.slice(1) : v);
  });
  return `https://api.dicebear.com/9.x/${styleKey(styleName)}/svg?${params}`;
}

export default function AvatarBuilder({ onClose }) {
  const authUser = useAuthStore((s) => s.authUser);
  const uploadAvatar = useAuthStore((s) => s.uploadAvatar);
  const entries = Object.entries(STYLES);
  const [selected, setSelected] = useState(entries[0][0]);
  const [seed, setSeed] = useState(randomSeed);
  const [saving, setSaving] = useState(false);

  const previewUrl = buildUrl(selected, {}, seed + (authUser?.fullName || "User"));

  const randomize = () => setSeed(randomSeed());

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = buildUrl(selected, {}, seed + (authUser?.fullName || "User"));
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`DiceBear returned ${resp.status}`);
      const svg = await resp.text();
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const file = new File([blob], "avatar.svg", { type: "image/svg+xml" });
      const result = await uploadAvatar(file);
      if (!result.success) throw new Error(result.error || "Upload failed");
      onClose();
    } catch (err) {
      console.error("Avatar save error:", err);
      alert(err.message || "Failed to generate avatar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content avatar-builder" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Avatar</h2>
          <button onClick={onClose}><X size={22} /></button>
        </div>
        <div className="avatar-builder-body">
          <div className="avatar-builder-preview-section">
            <div className="avatar-builder-preview">
              <img key={seed} src={previewUrl} alt="Preview" className="avatar-builder-preview-img" />
            </div>
            <div className="avatar-builder-preview-actions">
              <button className="btn-secondary" onClick={randomize}><RotateCw size={16} /> Randomize</button>
              <button className="btn-primary avatar-builder-save" onClick={handleSave} disabled={saving}>
                {saving ? <><RotateCw size={16} className="spin" /> Saving...</> : <><Check size={16} /> Save Avatar</>}
              </button>
            </div>
          </div>
          <div className="avatar-builder-controls">
            <div className="avatar-builder-styles">
              <label className="avatar-builder-label">Style</label>
              <div className="avatar-builder-style-grid">
                {entries.map(([key, st]) => (
                  <button
                    key={key}
                    className={`avatar-builder-style-item ${selected === key ? "active" : ""}`}
                    onClick={() => { setSelected(key); setSeed(randomSeed()); }}
                  >
                    <img src={buildUrl(key, {}, st.label)} alt={st.label} className="avatar-builder-style-thumb" />
                    <span className="avatar-builder-style-name">{st.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
