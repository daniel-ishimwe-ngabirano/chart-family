import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore.js";
import { useAdminAuthStore } from "../../stores/adminAuthStore.js";
import {
  LayoutDashboard, Flag, Settings, History, ArrowLeft, LogOut, Shield,
  Paintbrush, ShieldAlert, Megaphone, Menu, Users, Loader2, UserCog, FileText,
} from "lucide-react";

const sidebarItems = [
  { icon: <LayoutDashboard size={20} />, label: "Dashboard", path: "/admin" },
  { icon: <Users size={20} />, label: "Users", path: "/admin/users" },
  { icon: <Flag size={20} />, label: "Features", path: "/admin/features" },
  { icon: <Paintbrush size={20} />, label: "Theme", path: "/admin/theme" },
  { icon: <ShieldAlert size={20} />, label: "Moderation", path: "/admin/moderation" },
  { icon: <Megaphone size={20} />, label: "Broadcasts", path: "/admin/broadcasts" },
  { icon: <Menu size={20} />, label: "Navigation", path: "/admin/navigation" },
  { icon: <UserCog size={20} />, label: "Roles", path: "/admin/roles" },
  { icon: <FileText size={20} />, label: "Sections", path: "/admin/sections" },
  { icon: <Settings size={20} />, label: "Settings", path: "/admin/settings" },
  { icon: <History size={20} />, label: "Audit Log", path: "/admin/logs" },
];

export default function AdminLayout({ children }) {
  const { authUser, logout } = useAuthStore();
  const { adminSession, checking, checkAdminSession, logoutAdmin } = useAdminAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { checkAdminSession(); }, []);

  if (authUser?.role !== "admin") {
    return (
      <div className="admin-unauthorized">
        <Shield size={64} />
        <h2>Admin Access Required</h2>
        <p>You do not have permission to access this area.</p>
        <button className="btn primary" onClick={() => navigate("/chat")}>Back to Chat</button>
      </div>
    );
  }

  if (checking) {
    return <div className="loading-screen"><Loader2 size={48} className="spin" /></div>;
  }

  if (!adminSession) {
    navigate("/admin/login");
    return null;
  }

  const handleLogout = async () => {
    await logoutAdmin();
    logout();
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <Shield size={24} />
          <span>Admin Panel</span>
        </div>
        <nav className="admin-sidebar-nav">
          {sidebarItems.map((item) => (
            <button
              key={item.path}
              className={`admin-nav-item ${location.pathname === item.path ? "active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <button className="admin-nav-item" onClick={() => navigate("/chat")}>
            <ArrowLeft size={20} />
            <span>Back to App</span>
          </button>
          <button className="admin-nav-item" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <div className="admin-main-inner">
          {children}
        </div>
      </main>
    </div>
  );
}
