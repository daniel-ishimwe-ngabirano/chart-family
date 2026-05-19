import { useState, useCallback } from "react";
import { Phone, Bell } from "lucide-react";
import LeftSidebar from "../components/app/LeftSidebar.jsx";
import MobileBottomNav from "../components/app/MobileBottomNav.jsx";
import ChatList from "../components/app/ChatList.jsx";
import MainChat from "../components/app/MainChat.jsx";
import UserPanel from "../components/app/UserPanel.jsx";
import CallOverlay from "../components/app/CallOverlay.jsx";
import IncomingCall from "../components/app/IncomingCall.jsx";

function CallsPanel() {
  return (
    <div className="chat-list-panel">
      <div className="chat-list-header">
        <h2>Calls</h2>
      </div>
      <div className="chat-list-items" style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
        <Phone size={48} style={{ opacity: 0.3, marginBottom: "1rem" }} />
        <p>Call history will appear here</p>
      </div>
    </div>
  );
}

function NotificationsPanel() {
  return (
    <div className="chat-list-panel">
      <div className="chat-list-header">
        <h2>Notifications</h2>
      </div>
      <div className="chat-list-items" style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
        <Bell size={48} style={{ opacity: 0.3, marginBottom: "1rem" }} />
        <p>No notifications yet</p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [activeNav, setActiveNav] = useState("chats");
  const [showPanel, setShowPanel] = useState(false);
  const [mobileView, setMobileView] = useState("list");
  const handleSelectChat = useCallback(() => setMobileView("chat"), []);
  const handleBackToList = useCallback(() => setMobileView("list"), []);

  return (
    <div className="app-layout">
      <LeftSidebar activeNav={activeNav} onNavChange={setActiveNav} />
      <MobileBottomNav activeNav={activeNav} onNavChange={setActiveNav} />
      <div className={`app-main ${mobileView === "chat" ? "mobile-chat" : "mobile-list"}`}>
        {activeNav === "calls" ? (
          <CallsPanel />
        ) : activeNav === "notifications" ? (
          <NotificationsPanel />
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
