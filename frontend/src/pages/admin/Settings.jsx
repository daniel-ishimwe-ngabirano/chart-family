import { useEffect, useState } from "react";
import { useSettingsStore } from "../../stores/settingsStore.js";
import { useAdminAuthStore } from "../../stores/adminAuthStore.js";
import { Save, Loader2, Lock, Eye, EyeOff } from "lucide-react";
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
                ) : IMAGE_SETTING_KEYS.some((k) => setting.key.toLowerCase().includes(k) || k.toLowerCase().includes(setting.key)) ? (
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

      <AdminPasswordChange />
    </div>
  );
}

function AdminPasswordChange() {
  const { changeAdminPassword } = useAdminAuthStore();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters" });
      return;
    }
    setSaving(true);
    setMessage(null);
    const result = await changeAdminPassword(currentPassword, newPassword);
    if (result.success) {
      setMessage({ type: "success", text: "Admin password changed successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setMessage({ type: "error", text: result.error });
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">
        <Lock size={18} /> Admin Panel Password
      </h2>
      <form onSubmit={handleSubmit} className="admin-password-form">
        {message && (
          <div className={`admin-message ${message.type}`}>{message.text}</div>
        )}
        <div className="admin-password-field">
          <label>Current Password</label>
          <div className="admin-password-input-wrap">
            <input
              className="admin-input"
              type={show ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="admin-password-field">
          <label>New Password</label>
          <div className="admin-password-input-wrap">
            <input
              className="admin-input"
              type={show ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
        </div>
        <div className="admin-password-field">
          <label>Confirm New Password</label>
          <div className="admin-password-input-wrap">
            <input
              className="admin-input"
              type={show ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
        </div>
        <div className="admin-password-actions">
          <label className="admin-password-toggle">
            <input type="checkbox" checked={show} onChange={() => setShow(!show)} />
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
            {show ? "Hide" : "Show"} passwords
          </label>
          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? <Loader2 size={18} className="spin" /> : <Lock size={18} />}
            Change Password
          </button>
        </div>
      </form>
    </div>
  );
}
