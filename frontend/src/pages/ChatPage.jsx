import { useState, useCallback, useEffect } from "react";
import { Phone, Bell } from "lucide-react";
import LeftSidebar from "../components/app/LeftSidebar.jsx";
import MobileBottomNav from "../components/app/MobileBottomNav.jsx";
import ChatList from "../components/app/ChatList.jsx";
import MainChat from "../components/app/MainChat.jsx";
import UserPanel from "../components/app/UserPanel.jsx";
import CallOverlay from "../components/app/CallOverlay.jsx";
import IncomingCall from "../components/app/IncomingCall.jsx";
import { useAuthStore } from "../stores/authStore.js";
import { handleAvatarError } from "../utils/avatar.js";
import { STORAGE_KEYS } from "../lib/constants.js";

function CallsPanel() {
  const [calls, setCalls] = useState([]);
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.CALL_HISTORY);
    if (stored) {
      try { setCalls(JSON.parse(stored)); } catch {}
    }
  }, []);
  return (
    <div className="chat-list-panel">
      <div className="chat-list-header">
        <h2>Calls</h2>
      </div>
      <div className="chat-list-items">
        {calls.length === 0 ? (
          <div className="panel-empty-state">
            <Phone size={48} />
            <p>Call history will appear here</p>
          </div>
        ) : (
          calls.map((call, i) => (
            <div key={i} className="chat-list-item">
              <div className="chat-list-avatar">
                <img src={call.avatar || ""} alt="" onError={(e) => handleAvatarError(e, call.name || "Unknown")} />
              </div>
              <div className="chat-list-info">
                <div className="chat-list-top">
                  <span className="chat-list-name">{call.name || "Unknown"}</span>
                  <span className="chat-list-time">{call.time || ""}</span>
                </div>
                <div className="chat-list-bottom">
                  <span className="chat-list-preview">{call.type === "missed" ? "Missed call" : call.type === "incoming" ? "Incoming call" : "Outgoing call"}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function NotificationsPanel({ notifications }) {
  return (
    <div className="chat-list-panel">
      <div className="chat-list-header">
        <h2>Notifications</h2>
      </div>
      <div className="chat-list-items">
        {notifications.length === 0 ? (
          <div className="panel-empty-state">
            <Bell size={48} />
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((n, i) => (
            <div key={i} className="chat-list-item">
              <div className="chat-list-avatar">
                <img src={n.avatar || ""} alt="" onError={(e) => handleAvatarError(e, n.title)} />
              </div>
              <div className="chat-list-info">
                <div className="chat-list-top">
                  <span className="chat-list-name">{n.title}</span>
                  <span className="chat-list-time">{n.time || ""}</span>
                </div>
                <div className="chat-list-bottom">
                  <span className="chat-list-preview">{n.body}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [activeNav, setActiveNav] = useState("chats");
  const [showPanel, setShowPanel] = useState(false);
  const [mobileView, setMobileView] = useState("list");
  const [notifications, setNotifications] = useState([]);
  const { authUser } = useAuthStore();
  const handleSelectChat = useCallback(() => setMobileView("chat"), []);
  const handleBackToList = useCallback(() => setMobileView("list"), []);

  useEffect(() => {
    const stored = localStorage.getItem(`${STORAGE_KEYS.NOTIFICATIONS}_${authUser?.id}`);
    if (stored) {
      try { setNotifications(JSON.parse(stored)); } catch {}
    }
  }, [authUser?.id]);

  useEffect(() => {
    const handler = (e) => {
      const n = e.detail;
      setNotifications((prev) => {
        const updated = [n, ...prev].slice(0, 50);
        localStorage.setItem(`${STORAGE_KEYS.NOTIFICATIONS}_${authUser?.id}`, JSON.stringify(updated));
        return updated;
      });
    };
    window.addEventListener("app:notification", handler);
    return () => window.removeEventListener("app:notification", handler);
  }, [authUser?.id]);

  return (
    <div className="app-layout">
      <LeftSidebar activeNav={activeNav} onNavChange={setActiveNav} />
      <MobileBottomNav activeNav={activeNav} onNavChange={setActiveNav} />
      <div className={`app-main ${mobileView === "chat" ? "mobile-chat" : "mobile-list"}`}>
        {activeNav === "calls" ? (
          <CallsPanel />
        ) : activeNav === "notifications" ? (
          <NotificationsPanel notifications={notifications} />
        ) : (
          <>
            <div className="chat-list-panel-wrap">
              <ChatList onSelectChat={handleSelectChat} groupFilter={activeNav === "groups"} />
            </div>
            <div className="main-chat-wrap">
              <MainChat onTogglePanel={() => setShowPanel(!showPanel)} onBack={handleBackToList} />
            </div>
          </>
        )}
      </div>
      {showPanel && (
        <div className="user-panel-wrap">
          <UserPanel onClose={() => setShowPanel(false)} />
        </div>
      )}
      <CallOverlay />
      <IncomingCall />
    </div>
  );
}
