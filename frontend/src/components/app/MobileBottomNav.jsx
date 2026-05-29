import { useState } from "react";
import { MessageCircle, Users, Phone, Bell, LogOut, Circle } from "lucide-react";
import { useAuthStore } from "../../stores/authStore.js";
import { useTranslate } from "../../hooks/useTranslate.js";
import ProfileModal from "../ProfileModal.jsx";
import { handleAvatarError } from "../../utils/avatar.js";

export default function MobileBottomNav({ activeNav, onNavChange, onOpenStoryCreator }) {
  const { authUser, logout } = useAuthStore();
  const t = useTranslate();
  const [showProfile, setShowProfile] = useState(false);

  const items = [
    { id: "chats", icon: MessageCircle, label: t("nav.chats", "Chats") },
    { id: "groups", icon: Users, label: t("nav.groups", "Groups") },
    { id: "status", icon: Circle, label: t("nav.status", "Status"), action: true },
    { id: "calls", icon: Phone, label: t("nav.calls", "Calls") },
    { id: "notifications", icon: Bell, label: t("nav.alerts", "Alerts") },
  ];

  return (
    <>
      <div className="mobile-bottom-nav">
        <div className="mobile-nav-items">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`mobile-nav-item ${activeNav === item.id ? "active" : ""}`}
                onClick={() => item.action ? onOpenStoryCreator?.() : onNavChange(item.id)}
              >
                <Icon size={22} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mobile-nav-actions">
          <button className="mobile-nav-avatar" onClick={() => setShowProfile(true)}>
            <img
              src={authUser?.avatar || "/default-avatar.svg"}
              alt=""
              className="mobile-nav-avatar-img"
              onError={(e) => handleAvatarError(e, authUser?.fullName)}
            />
          </button>
          <button className="mobile-nav-item" onClick={logout}>
            <LogOut size={18} />
          </button>
        </div>
      </div>
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </>
  );
}
