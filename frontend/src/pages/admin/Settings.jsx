import { useEffect, useState } from "react";
import { useSettingsStore } from "../../stores/settingsStore.js";
import { Save, Loader2 } from "lucide-react";
import AdminImageUpload from "../../components/AdminImageUpload.jsx";

const IMAGE_SETTING_KEYS = ["logo", "favicon", "og_image", "background", "banner", "avatar_default", "icon", "image"];

export default function AdminSettings() {
  const { settings, loading, fetchSettings, updateSettings } = useSettingsStore();
  const [local, setLocal] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    const map = {};
    settings.forEach((s) => { map[s.key] = s.value; });
    setLocal((prev) => ({ ...prev, ...map }));
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const updates = settings.map((s) => ({ key: s.key, value: local[s.key] ?? s.value }));
    const result = await updateSettings(updates);
    if (result.success) {
      setMessage({ type: "success", text: "Settings saved successfully" });
    } else {
      setMessage({ type: "error", text: result.error });
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const grouped = settings.reduce((acc, s) => {
    if (!acc[s.group]) acc[s.group] = [];
    acc[s.group].push(s);
    return acc;
  }, {});

  if (loading && settings.length === 0) {
    return <div className="loading-center"><Loader2 size={32} className="spin" /></div>;
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1>Settings</h1>
        <p>Manage global application settings</p>
      </div>

      {message && (
        <div className={`admin-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {Object.entries(grouped).map(([group, items]) => (
        <div key={group} className="admin-section">
          <h2 className="admin-section-title" style={{ textTransform: "capitalize" }}>
            {group}
          </h2>
          <div className="admin-settings-list">
            {items.map((setting) => (
              <div key={setting.key} className="admin-setting-item">
                <label className="admin-setting-label">
                  {setting.label || setting.key}
                </label>
                {setting.type === "boolean" ? (
                  <label className="admin-switch">
                    <input
                      type="checkbox"
                      checked={local[setting.key] === "true"}
                      onChange={(e) => setLocal({ ...local, [setting.key]: e.target.checked ? "true" : "false" })}
                    />
                    <span className="admin-switch-slider" />
                  </label>
                ) : IMAGE_SETTING_KEYS.some((k) => setting.key.toLowerCase().includes(k)) ? (
                  <AdminImageUpload
                    value={local[setting.key] ?? ""}
                    onChange={(val) => setLocal({ ...local, [setting.key]: val })}
                    label={setting.label || setting.key}
                  />
                ) : (
                  <input
                    className="admin-input"
                    type={setting.type === "number" ? "number" : "text"}
                    value={local[setting.key] ?? ""}
                    onChange={(e) => setLocal({ ...local, [setting.key]: e.target.value })}
                  />
                )}
                <code className="admin-setting-key">{setting.key}</code>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="admin-save-bar">
        <button className="btn primary" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
          Save Changes
        </button>
      </div>
    </div>
  );
}
