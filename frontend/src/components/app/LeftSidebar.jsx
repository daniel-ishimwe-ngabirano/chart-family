import { useState } from "react";
import { useAuthStore } from "../../stores/authStore.js";
import { useChatStore } from "../../stores/chatStore.js";
import { useFeatureStore } from "../../stores/featureStore.js";
import { useTranslate } from "../../hooks/useTranslate.js";
import { useNavigate } from "react-router-dom";
import { MessageCircle, MessageSquare, Phone, Users, Settings, Bell, LogOut, Shield } from "lucide-react";
import ProfileModal from "../ProfileModal.jsx";
import { handleAvatarError } from "../../utils/avatar.js";

export default function LeftSidebar({ activeNav, onNavChange }) {
  const { authUser, logout } = useAuthStore();
  const features = useFeatureStore();
  const t = useTranslate();
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { icon: <MessageSquare size={22} />, label: t("nav.chats", "Chats"), key: "chats", flag: "chat_enabled" },
    { icon: <Users size={22} />, label: t("nav.groups", "Groups"), key: "groups", flag: "groups_enabled" },
    { icon: <Phone size={22} />, label: t("nav.calls", "Calls"), key: "calls", flag: "voice_calls" },
    { icon: <Bell size={22} />, label: t("nav.notifications", "Notifications"), key: "notifications", flag: "notifications_enabled" },
    { icon: <Settings size={22} />, label: t("nav.settings", "Settings"), key: "settings" },
  ];

  const handleNavClick = (key) => {
    if (key === "settings") {
      setShowProfile(true);
      return;
    }
    onNavChange(key);
  };

  return (
    <div className="app-sidebar">
      <div className="sidebar-logo">
        <MessageCircle size={24} className="sidebar-brand-icon" />
      </div>
      <div className="sidebar-nav">
        {navItems.map((item) => {
          if (item.flag && !features.isEnabled(item.flag)) return null;
          return (
            <button
              key={item.key}
              className={`sidebar-nav-item ${activeNav === item.key ? "active" : ""}`}
              onClick={() => handleNavClick(item.key)}
              title={item.label}
            >
              {item.icon}
            </button>
          );
        })}
      </div>
      <div className="sidebar-bottom">
        {authUser?.role === "admin" && (
          <button className="sidebar-nav-item" onClick={() => navigate("/admin")} title={t("nav.admin", "Admin Panel")}>
            <Shield size={20} />
          </button>
        )}
        <button className="sidebar-nav-item" onClick={() => setShowProfile(true)} title={t("nav.profile", "Profile")}>
          <img src={authUser?.avatar || "/default-avatar.svg"} alt="" className="sidebar-avatar" onError={(e) => handleAvatarError(e, authUser?.fullName)} />
        </button>
        <button className="sidebar-nav-item" onClick={logout} title={t("nav.logout", "Logout")}>
          <LogOut size={20} />
        </button>
      </div>
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  );
}
