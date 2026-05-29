import { useState } from "react";
import { useAuthStore } from "../stores/authStore.js";
import { X, Check, RotateCw } from "lucide-react";

const STYLES = {
  avataaars: {
    label: "Avatar",
    desc: "Cartoon face",
    options: {
      skinColor: { label: "Skin", values: ["pale", "light", "brown", "dark", "black"] },
      top: { label: "Hair", values: ["shortHair", "longHair", "curly", "thePompadour", "theQuiff", "theBun", "hat", "hijab", "turban", "winterHat1", "eyepatch"] },
      accessories: { label: "Glasses", values: ["none", "glasses", "sunglasses", "prescription01", "prescription02"] },
      clothing: { label: "Clothes", values: ["blazer", "hoodie", "shirtCrewNeck", "shirtScoopNeck", "shirtVNeck", "collarAndSweater"] },
      mouth: { label: "Mouth", values: ["default", "smile", "serious", "sad", "surprised", "twinkle"] },
    },
  },
  adventurer: {
    label: "Adventurer",
    desc: "Game character",
    options: {
      skinColor: { label: "Skin", values: ["pale", "light", "brown", "dark", "black"] },
      hair: { label: "Hair", values: ["short", "long", "curly", "mohawk", "braids", "bun", "bald"] },
      accessories: { label: "Glasses", values: ["none", "glasses", "sunglasses"] },
    },
  },
  lorelei: {
    label: "Lorelei",
    desc: "Modern illustration",
    options: {
      skinColor: { label: "Skin", values: ["pale", "light", "brown", "dark", "black"] },
      hair: { label: "Style", values: ["long", "bun", "curly", "braids", "short", "mohawk", "wavy"] },
      accessories: { label: "Glasses", values: ["none", "glasses", "sunglasses", "tinyGlasses"] },
    },
  },
  notionists: {
    label: "Notionists",
    desc: "Minimalist figure",
    options: {
      skinColor: { label: "Skin", values: ["pale", "light", "brown", "dark", "black"] },
      hair: { label: "Hair", values: ["short", "long", "curly", "bun", "braids", "bald"] },
      accessories: { label: "Glasses", values: ["none", "glasses", "sunglasses", "prescription"] },
    },
  },
  micah: {
    label: "Micah",
    desc: "Hand-drawn style",
    options: {
      skinColor: { label: "Skin", values: ["pale", "light", "brown", "dark", "black"] },
      hair: { label: "Hair", values: ["short", "long", "curly", "bun", "braids", "mohawk", "bald"] },
      accessories: { label: "Glasses", values: ["none", "glasses", "sunglasses"] },
    },
  },
  openPeeps: {
    label: "Open Peeps",
    desc: "Hand-drawn figure",
    options: {
      skinColor: { label: "Skin", values: ["pale", "light", "brown", "dark", "black"] },
      hair: { label: "Hair", values: ["short", "long", "curly", "bun", "braids", "bald"] },
      accessories: { label: "Glasses", values: ["none", "glasses", "sunglasses"] },
    },
  },
  bottts: {
    label: "Bottts",
    desc: "Robot character",
    options: {
      primaryColor: { label: "Color 1", values: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#F7DC6F", "#85C1E9", "#F0B27A", "#82E0AA"] },
      secondaryColor: { label: "Color 2", values: ["#4ECDC4", "#FF6B6B", "#45B7D1", "#96CEB4", "#F1948A", "#BB8FCE", "#98D8C8", "#A9CCE3", "#D7BDE2", "#73C6B6"] },
      texture: { label: "Texture", values: ["none", "diamond", "dots", "grid", "lines", "squares"] },
      mouth: { label: "Mouth", values: ["default", "smile", "open", "sad", "surprise", "grin"] },
    },
  },
  identicon: {
    label: "Identicon",
    desc: "Geometric pattern",
    options: {},
  },
  initials: {
    label: "Initials",
    desc: "Name initials",
    options: {},
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
  const [opts, setOpts] = useState({ backgroundColor: "transparent" });
  const [saving, setSaving] = useState(false);

  const styleDef = STYLES[selected];
  const previewUrl = buildUrl(selected, opts, authUser?.fullName || "User");

  const setOpt = (key, value) => setOpts((p) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = buildUrl(selected, opts, authUser?.fullName || "User");
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
              <img src={previewUrl} alt="Preview" className="avatar-builder-preview-img" />
            </div>
            <button className="btn-primary avatar-builder-save" onClick={handleSave} disabled={saving}>
              {saving ? <><RotateCw size={16} className="spin" /> Saving...</> : <><Check size={16} /> Save Avatar</>}
            </button>
          </div>
          <div className="avatar-builder-controls">
            <div className="avatar-builder-styles">
              <label className="avatar-builder-label">Style</label>
              <div className="avatar-builder-style-grid">
                {entries.map(([key, st]) => (
                  <button
                    key={key}
                    className={`avatar-builder-style-item ${selected === key ? "active" : ""}`}
                    onClick={() => { setSelected(key); setOpts({ backgroundColor: "transparent" }); }}
                  >
                    <img src={buildUrl(key, {}, authUser?.fullName || "User")} alt={st.label} className="avatar-builder-style-thumb" />
                    <span className="avatar-builder-style-name">{st.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {Object.keys(styleDef.options).length > 0 && (
              <div className="avatar-builder-options">
                {Object.entries(styleDef.options).map(([key, opt]) => (
                  <div key={key} className="avatar-builder-option">
                    <label className="avatar-builder-label">{opt.label}</label>
                    <div className="avatar-builder-option-values">
                      {opt.values.map((v) => {
                        const isColor = v.startsWith("#");
                        return (
                          <button
                            key={v}
                            className={`avatar-builder-option-value ${opts[key] === v || (opts[key] === undefined && v === (opt.values[0] || opt.values[0])) ? "active" : ""}`}
                            onClick={() => setOpt(key, v)}
                          >
                            {isColor ? <span className="avatar-builder-color-swatch" style={{ background: v }} /> : v}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="avatar-builder-option">
                  <label className="avatar-builder-label">Background</label>
                  <div className="avatar-builder-option-values">
                    <button className={`avatar-builder-option-value ${!opts.backgroundColor || opts.backgroundColor === "transparent" ? "active" : ""}`} onClick={() => setOpt("backgroundColor", "transparent")}>None</button>
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c}
                        className={`avatar-builder-option-value ${opts.backgroundColor === c ? "active" : ""}`}
                        onClick={() => setOpt("backgroundColor", c)}
                      >
                        <span className="avatar-builder-color-swatch" style={{ background: c }} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
