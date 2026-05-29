import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../stores/authStore.js";
import { useThemePrefStore } from "../stores/themePrefStore.js";
import { useLocaleStore, locales_list } from "../stores/localeStore.js";
import { useTranslate } from "../hooks/useTranslate.js";
import {
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
} from "../utils/push.js";
import { X, Camera, Moon, Sun, Bell, Shield, Eye, LogOut, Globe, Languages, Sparkles, Palette } from "lucide-react";
import { handleAvatarError, generateAvatarSvg } from "../utils/avatar.js";
import AvatarBuilder from "./AvatarBuilder.jsx";

const SETTINGS_KEY = "wavechat_user_settings";
let swRegistration = null;

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export default function ProfileModal({ onClose }) {
  const { authUser, updateProfile, uploadAvatar, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemePrefStore();
  const { locale, setLocale } = useLocaleStore();
  const t = useTranslate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: authUser?.fullName || "",
    username: authUser?.username || "",
    bio: authUser?.bio || "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAvatarBuilder, setShowAvatarBuilder] = useState(false);
  const [notifications, setNotifications] = useState(() => loadSettings().notifications ?? true);
  const [lastSeen, setLastSeen] = useState(() => loadSettings().lastSeen ?? "everyone");
  const fileRef = useRef(null);

  useEffect(() => {
    saveSettings({ notifications, lastSeen });
  }, [notifications, lastSeen]);

  useEffect(() => {
    registerServiceWorker().then((reg) => {
      swRegistration = reg;
    });
  }, []);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const result = await uploadAvatar(file);
    setUploadingAvatar(false);
    if (!result.success) {
      alert(result.error || "Failed to upload avatar");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    await updateProfile(form);
    setSaving(false);
    setEditing(false);
  };

  const handleGenerateAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const svg = generateAvatarSvg(authUser?.fullName || "User", 200);
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const file = new File([blob], "avatar.svg", { type: "image/svg+xml" });
      await uploadAvatar(file);
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t("settings.profile", "Settings")}</h2>
          <button onClick={onClose}><X size={22} /></button>
        </div>

        <div className="modal-body">
          <div className="profile-section">
            <div className="profile-avatar-section">
              <img src={authUser?.avatar || "/avatar-placeholder.png"} alt="" className="profile-avatar" onError={(e) => handleAvatarError(e, authUser?.fullName)} />
              <button className="avatar-edit" onClick={() => fileRef.current?.click()} disabled={uploadingAvatar} title="Upload photo">
                {uploadingAvatar ? <span className="avatar-spinner" /> : <Camera size={18} />}
              </button>
              <button className="avatar-edit avatar-generate" onClick={handleGenerateAvatar} disabled={uploadingAvatar} title="Generate initials avatar">
                <Sparkles size={18} />
              </button>
              <button className="avatar-edit avatar-builder-btn" onClick={() => setShowAvatarBuilder(true)} title="Create custom avatar">
                <Palette size={18} />
              </button>
              <input ref={fileRef} type="file" hidden accept="image/*" onChange={handleAvatarChange} />
            </div>

            {editing ? (
              <div className="profile-edit-form">
                <div className="input-group">
                  <label>{t("auth.fullName", "Full Name")}</label>
                  <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                </div>
                <div className="input-group">
                  <label>Username</label>
                  <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                </div>
                <div className="input-group">
                  <label>Bio</label>
                  <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} />
                </div>
                <div className="edit-actions">
                  <button className="btn-secondary" onClick={() => setEditing(false)}>{t("common.cancel", "Cancel")}</button>
                  <button className="btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? t("common.loading", "Saving...") : t("common.save", "Save")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="profile-info">
                <h3>{authUser?.fullName}</h3>
                <p className="profile-username">@{authUser?.username}</p>
                <p className="profile-bio">{authUser?.bio}</p>
                <p className="profile-email">{authUser?.email}</p>
                <button className="btn-secondary" onClick={() => setEditing(true)}>{t("common.edit", "Edit Profile")}</button>
              </div>
            )}
          </div>

          <div className="settings-divider" />

          <div className="settings-section">
            <h3>{t("settings.privacy", "Privacy")}</h3>
            <div className="setting-item">
              <div className="setting-icon"><Eye size={20} /></div>
              <div className="setting-info">
                <span>{t("settings.lastSeen", "Last Seen")}</span>
                <select value={lastSeen} onChange={(e) => setLastSeen(e.target.value)}>
                  <option value="everyone">{t("common.all", "Everyone")}</option>
                  <option value="contacts">My Contacts</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>
            </div>
            <div className="setting-item">
              <div className="setting-icon"><Shield size={20} /></div>
              <div className="setting-info">
                <span>{t("settings.readReceipts", "Read Receipts")}</span>
                <label className="toggle">
                  <input type="checkbox" defaultChecked onChange={() => {}} />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
          </div>

          <div className="settings-divider" />

          <div className="settings-section">
            <h3>{t("settings.appearance", "Appearance")}</h3>
            <div className="setting-item">
              <div className="setting-icon">{theme === "dark" ? <Moon size={20} /> : <Sun size={20} />}</div>
              <div className="setting-info">
                <span>{theme === "dark" ? t("settings.darkMode", "Dark Mode") : t("settings.lightMode", "Light Mode")}</span>
                <label className="toggle">
                  <input type="checkbox" checked={theme === "dark"} onChange={toggleTheme} />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
            <div className="setting-item">
              <div className="setting-icon"><Languages size={20} /></div>
              <div className="setting-info">
                <span>{t("settings.language", "Language")}</span>
                <select value={locale} onChange={(e) => setLocale(e.target.value)}>
                  {locales_list.map((l) => (
                    <option key={l.code} value={l.code}>{l.native}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="settings-divider" />

          <div className="settings-section">
            <h3>{t("settings.notifications", "Notifications")}</h3>
            <div className="setting-item">
              <div className="setting-icon"><Bell size={20} /></div>
              <div className="setting-info">
                <span>{t("settings.pushNotifications", "Push Notifications")}</span>
                <label className="toggle">
                  <input type="checkbox" checked={notifications} onChange={async () => {
                    const next = !notifications;
                    setNotifications(next);
                    if (next) {
                      await subscribeToPush(swRegistration);
                    } else {
                      await unsubscribeFromPush(swRegistration);
                    }
                  }} />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
          </div>

          <div className="settings-divider" />

          <button className="logout-btn" onClick={logout}>
            <LogOut size={18} />
            {t("settings.signOut", "Sign Out")}
          </button>
        </div>
      </div>
      {showAvatarBuilder && <AvatarBuilder onClose={() => setShowAvatarBuilder(false)} />}
    </div>
  );
}
