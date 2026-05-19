import { useEffect, useState } from "react";
import axios from "../../lib/axios.js";
import { Paintbrush, Save, Loader2 } from "lucide-react";

const themeFields = [
  { key: "theme_primary_color", label: "Primary Color", type: "color" },
  { key: "theme_accent_color", label: "Accent Color", type: "color" },
  { key: "theme_bg_color", label: "Background Color", type: "color" },
  { key: "theme_border_radius", label: "Border Radius", type: "text", hint: "e.g. 8px, 12px, 20px" },
  { key: "theme_font", label: "Font Family", type: "text", hint: "e.g. 'Inter', sans-serif" },
  { key: "theme_sidebar_style", label: "Sidebar Style", type: "select", options: ["solid", "glass", "minimal"] },
  { key: "theme_chat_bubble_style", label: "Chat Bubble Style", type: "select", options: ["rounded", "square", "modern"] },
  { key: "theme_animation", label: "Animations", type: "select", options: ["all", "minimal", "none"] },
  { key: "theme_mode", label: "Theme Mode", type: "select", options: ["dark", "light"] },
];

export default function AdminTheme() {
  const [settings, setSettings] = useState([]);
  const [local, setLocal] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    axios.get("/admin/settings?group=theme")
      .then((r) => {
        setSettings(r.data);
        const map = {};
        r.data.forEach((s) => { map[s.key] = s.value; });
        setLocal(map);
      })
      .catch(() => {});
  }, []);

  const applyThemePreview = (key, value) => {
    const cssVar = `--${key.replace("theme_", "").replace(/_/g, "-")}`;
    document.documentElement.style.setProperty(cssVar, value);
  };

  const handleChange = (key, value) => {
    setLocal({ ...local, [key]: value });
    applyThemePreview(key, value);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updates = settings.map((s) => ({ key: s.key, value: local[s.key] ?? s.value }));
      await axios.put("/admin/settings", { settings: updates });
      setMessage({ type: "success", text: "Theme saved! Refresh to see full effect." });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save theme" });
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1><Paintbrush size={24} /> Theme</h1>
        <p>Customize appearance — colors, fonts, styles applied instantly</p>
      </div>

      {message && <div className={`admin-message ${message.type}`}>{message.text}</div>}

      <div className="admin-section">
        <div className="admin-theme-grid">
          {themeFields.map((field) => {
            const val = local[field.key] ?? "";
            return (
              <div key={field.key} className="admin-theme-field">
                <label>{field.label}</label>
                {field.type === "color" ? (
                  <div className="admin-color-picker">
                    <input
                      type="color"
                      value={val || "#000000"}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                    />
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder="#hex"
                    />
                  </div>
                ) : field.type === "select" ? (
                  <select value={val} onChange={(e) => handleChange(field.key, e.target.value)}>
                    {field.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.hint || ""}
                  />
                )}
                <code>{field.key}</code>
              </div>
            );
          })}
        </div>
      </div>

      <div className="admin-save-bar">
        <button className="btn primary" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
          Save Theme
        </button>
      </div>
    </div>
  );
}
