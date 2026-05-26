import { useState, useEffect } from "react";
import axios from "../../lib/axios.js";
import { Users, MessageCircle, Phone, Globe, Activity, Loader2, AlertCircle } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [server, setServer] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get("/admin/stats").then((r) => setStats(r.data)).catch(() => setError("Failed to load stats"));
    axios.get("/admin/server").then((r) => setServer(r.data)).catch(() => {});
  }, []);

  if (error && !stats) {
    return <div className="admin-empty"><AlertCircle size={48} /><p>{error}</p><button className="btn primary" onClick={() => window.location.reload()}>Retry</button></div>;
  }

  if (!stats) {
    return <div className="loading-center"><Loader2 size={32} className="spin" /></div>;
  }

  const statCards = [
    { icon: <Users size={28} />, label: "Total Users", value: stats.totalUsers, color: "#7c3aed" },
    { icon: <Activity size={28} />, label: "Online Now", value: stats.onlineUsers, color: "#22c55e" },
    { icon: <MessageCircle size={28} />, label: "Conversations", value: stats.totalConversations, color: "#3b82f6" },
    { icon: <MessageCircle size={28} />, label: "Messages", value: stats.totalMessages, color: "#f59e0b" },
    { icon: <Phone size={28} />, label: "Calls", value: stats.totalCalls, color: "#ef4444" },
  ];

  return (
    <div>
      <div className="admin-page-header">
        <h1>Dashboard</h1>
        <p>Overview of your chat platform</p>
      </div>

      <div className="admin-stats-grid">
        {statCards.map((card) => (
          <div key={card.label} className="admin-stat-card" style={{ borderTop: `3px solid ${card.color}` }}>
            <div className="admin-stat-icon" style={{ color: card.color }}>{card.icon}</div>
            <div className="admin-stat-info">
              <h2>{card.value}</h2>
              <p>{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {server && (
        <div className="admin-section">
          <h2 className="admin-section-title">
            <Globe size={20} /> Server
          </h2>
          <div className="admin-server-grid">
            <div className="admin-server-item">
              <span className="server-label">Uptime</span>
              <span className="server-value">{Math.floor(server.uptime / 86400)}d {Math.floor((server.uptime % 86400) / 3600)}h {Math.floor((server.uptime % 3600) / 60)}m</span>
            </div>
            <div className="admin-server-item">
              <span className="server-label">Node.js</span>
              <span className="server-value">{server.nodeVersion}</span>
            </div>
            <div className="admin-server-item">
              <span className="server-label">Platform</span>
              <span className="server-value">{server.platform}</span>
            </div>
            <div className="admin-server-item">
              <span className="server-label">Heap Used</span>
              <span className="server-value">{server.memory?.heapUsed} MB</span>
            </div>
            <div className="admin-server-item">
              <span className="server-label">RSS</span>
              <span className="server-value">{server.memory?.rss} MB</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
