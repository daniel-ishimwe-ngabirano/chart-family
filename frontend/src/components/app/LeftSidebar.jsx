import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../../stores/authStore.js";
import { useChatStore } from "../../stores/chatStore.js";
import { useFeatureStore } from "../../stores/featureStore.js";
import { useTranslate } from "../../hooks/useTranslate.js";
import { useLocaleStore, locales_list } from "../../stores/localeStore.js";
import { useNavigate } from "react-router-dom";
import { MessageCircle, MessageSquare, Phone, Users, Settings, Bell, LogOut, Shield, Circle, Globe } from "lucide-react";
import ProfileModal from "../ProfileModal.jsx";
import { handleAvatarError } from "../../utils/avatar.js";

export default function LeftSidebar({ activeNav, onNavChange, onOpenStoryCreator }) {
  const { authUser, logout } = useAuthStore();
  const features = useFeatureStore();
  const t = useTranslate();
  const { locale, setLocale } = useLocaleStore();
  const [showProfile, setShowProfile] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const langRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClick = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setShowLang(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const navItems = [
    { icon: <MessageSquare size={22} />, label: t("nav.chats", "Chats"), key: "chats", flag: "chat_enabled" },
    { icon: <Users size={22} />, label: t("nav.groups", "Groups"), key: "groups", flag: "groups_enabled" },
    { icon: <Circle size={22} />, label: t("nav.status", "Status"), key: "status", flag: "stories_enabled" },
    { icon: <Phone size={22} />, label: t("nav.calls", "Calls"), key: "calls", flag: "voice_calls" },
    { icon: <Bell size={22} />, label: t("nav.notifications", "Notifications"), key: "notifications", flag: "notifications_enabled" },
    { icon: <Settings size={22} />, label: t("nav.settings", "Settings"), key: "settings" },
  ];

  const handleNavClick = (key) => {
    if (key === "settings") {
      setShowProfile(true);
      return;
    }
    if (key === "status") {
      onOpenStoryCreator?.();
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
        <div className="sidebar-lang-wrapper" ref={langRef}>
          <button className="sidebar-nav-item" onClick={() => setShowLang(!showLang)} title={t("nav.language", "Language")}>
            <Globe size={20} />
          </button>
          {showLang && (
            <div className="sidebar-lang-dropdown">
              {locales_list.map((l) => (
                <button
                  key={l.code}
                  className={`sidebar-lang-option ${locale === l.code ? "active" : ""}`}
                  onClick={() => { setLocale(l.code); setShowLang(false); }}
                >
                  {l.native}
                </button>
              ))}
            </div>
          )}
        </div>
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
