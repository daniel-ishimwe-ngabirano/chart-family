import { useEffect, useState } from "react";
import { useSettingsStore } from "../../stores/settingsStore.js";
import { Save, Loader2, Video, Image, Music, FileText, Upload, Settings } from "lucide-react";

export default function AdminMediaSettings() {
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
    const updates = settings.filter(s => 
      s.group === 'media' || s.group === 'limits'
    ).map((s) => ({ key: s.key, value: local[s.key] ?? s.value }));
    
    const result = await updateSettings(updates);
    if (result.success) {
      setMessage({ type: "success", text: "Media settings saved successfully" });
    } else {
      setMessage({ type: "error", text: result.error });
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const mediaSettings = settings.filter(s => s.group === 'media' || s.group === 'limits');

  if (loading && settings.length === 0) {
    return <div className="loading-center"><Loader2 size={32} className="spin" /></div>;
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1><Settings size={24} /> Media & Upload Settings</h1>
        <p>Configure file upload limits, formats, and media handling</p>
      </div>

      {message && (
        <div className={`admin-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="admin-section">
        <h2 className="admin-section-title">
          <Upload size={20} /> Upload Limits
        </h2>
        <div className="admin-settings-grid">
          {mediaSettings.filter(s => s.key.includes('size') || s.key.includes('max_')).map((setting) => (
            <div key={setting.key} className="admin-setting-card">
              <div className="admin-setting-icon">
                {setting.key.includes('video') ? <Video size={20} /> :
                 setting.key.includes('image') ? <Image size={20} /> :
                 setting.key.includes('audio') ? <Music size={20} /> :
                 <FileText size={20} />}
              </div>
              <div className="admin-setting-content">
                <label className="admin-setting-label">
                  {setting.label || setting.key}
                </label>
                <input
                  className="admin-input"
                  type="number"
                  min="1"
                  max="500"
                  value={local[setting.key] ?? ""}
                  onChange={(e) => setLocal({ ...local, [setting.key]: e.target.value })}
                />
                <span className="admin-setting-hint">
                  {setting.key.includes('size') ? 'MB' : setting.key.includes('members') ? 'users' : 'chars'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-section">
        <h2 className="admin-section-title">
          <Video size={20} /> Supported Formats
        </h2>
        <div className="admin-settings-list">
          {mediaSettings.filter(s => s.key.includes('formats')).map((setting) => (
            <div key={setting.key} className="admin-setting-item">
              <label className="admin-setting-label">
                {setting.label || setting.key}
              </label>
              <textarea
                className="admin-input"
                rows={2}
                placeholder="Comma separated formats (e.g., mp4,webm,mov)"
                value={local[setting.key] ?? ""}
                onChange={(e) => setLocal({ ...local, [setting.key]: e.target.value })}
              />
              <code className="admin-setting-key">{setting.key}</code>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-section">
        <h2 className="admin-section-title">
          <Settings size={20} /> Media Options
        </h2>
        <div className="admin-settings-list">
          {mediaSettings.filter(s => s.type === 'boolean').map((setting) => (
            <div key={setting.key} className="admin-setting-item">
              <label className="admin-setting-label">
                {setting.label || setting.key}
              </label>
              <label className="admin-switch">
                <input
                  type="checkbox"
                  checked={local[setting.key] === "true"}
                  onChange={(e) => setLocal({ ...local, [setting.key]: e.target.checked ? "true" : "false" })}
                />
                <span className="admin-switch-slider" />
              </label>
              <code className="admin-setting-key">{setting.key}</code>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-save-bar">
        <button className="btn primary" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
          Save Media Settings
        </button>
      </div>
    </div>
  );
}