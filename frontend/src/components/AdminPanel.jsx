import { useState, useEffect } from "react";
import { useAuthStore } from "../stores/authStore.js";
import { Users, BarChart3, Server, Flag, Ban, Search, ArrowLeft, Loader2 } from "lucide-react";
import axios from "../lib/axios.js";

function Tab({ icon, label, active, onClick }) {
  return (
    <button className={`admin-tab ${active ? "active" : ""}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

export default function AdminPanel({ onClose }) {
  const { authUser } = useAuthStore();
  const [tab, setTab] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [serverInfo, setServerInfo] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab === "dashboard") {
      axios.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {});
    }
    if (tab === "users") {
      setLoading(true);
      axios.get("/admin/users", { params: { page, search } })
        .then((r) => { setUsers(r.data.users); setTotal(r.data.total); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
    if (tab === "server") {
      axios.get("/admin/server").then((r) => setServerInfo(r.data)).catch(() => {});
    }
  }, [tab, page, search]);

  const handleBan = async (userId) => {
    await axios.post(`/admin/users/${userId}/ban`);
    setUsers(users.map((u) => u.id === userId ? { ...u, role: "banned" } : u));
  };

  const handleUnban = async (userId) => {
    await axios.post(`/admin/users/${userId}/unban`);
    setUsers(users.map((u) => u.id === userId ? { ...u, role: "user" } : u));
  };

  if (authUser?.role !== "admin") {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content"><p>Admin access required</p></div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <button onClick={onClose}><ArrowLeft size={22} /></button>
          <h2>Admin Panel</h2>
        </div>

        <div className="admin-tabs">
          <Tab icon={<BarChart3 size={18} />} label="Dashboard" active={tab === "dashboard"} onClick={() => setTab("dashboard")} />
          <Tab icon={<Users size={18} />} label="Users" active={tab === "users"} onClick={() => setTab("users")} />
          <Tab icon={<Server size={18} />} label="Server" active={tab === "server"} onClick={() => setTab("server")} />
          <Tab icon={<Flag size={18} />} label="Reports" active={tab === "reports"} onClick={() => setTab("reports")} />
        </div>

        <div className="admin-content">
          {tab === "dashboard" && stats && (
            <div className="stats-grid">
              <div className="stat-card"><Users size={32} /><div><h3>{stats.totalUsers}</h3><p>Total Users</p></div></div>
              <div className="stat-card"><div><h3>{stats.onlineUsers}</h3><p>Online Now</p></div></div>
              <div className="stat-card"><div><h3>{stats.totalConversations}</h3><p>Conversations</p></div></div>
              <div className="stat-card"><div><h3>{stats.totalMessages}</h3><p>Messages</p></div></div>
            </div>
          )}

          {tab === "users" && (
            <div>
              <div className="search-bar">
                <Search size={18} />
                <input placeholder="Search users..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
              </div>
              {loading ? (
                <div className="loading-center"><Loader2 size={24} className="spin" /></div>
              ) : (
                <div className="admin-user-list">
                  {users.map((u) => (
                    <div key={u.id} className="admin-user-item">
                      <img src={u.avatar} alt="" className="avatar" />
                      <div className="admin-user-info">
                        <span className="admin-user-name">{u.fullName}</span>
                        <span className="admin-user-detail">{u.email || u.phone} · {u.role}</span>
                      </div>
                      <div className="admin-user-actions">
                        {u.role === "banned" ? (
                          <button className="btn-small success" onClick={() => handleUnban(u.id)}>Unban</button>
                        ) : (
                          <button className="btn-small danger" onClick={() => handleBan(u.id)}><Ban size={14} /> Ban</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {total > 20 && (
                <div className="pagination">
                  <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
                  <span>Page {page}</span>
                  <button disabled={page * 20 >= total} onClick={() => setPage(page + 1)}>Next</button>
                </div>
              )}
            </div>
          )}

          {tab === "server" && serverInfo && (
            <div className="server-info">
              <div className="server-stat"><span>Uptime</span><span>{Math.floor(serverInfo.uptime / 60)}m {serverInfo.uptime % 60}s</span></div>
              <div className="server-stat"><span>Node Version</span><span>{serverInfo.nodeVersion}</span></div>
              <div className="server-stat"><span>Platform</span><span>{serverInfo.platform}</span></div>
              <div className="server-stat"><span>Heap Used</span><span>{serverInfo.memory?.heapUsed} MB</span></div>
              <div className="server-stat"><span>RSS</span><span>{serverInfo.memory?.rss} MB</span></div>
            </div>
          )}

          {tab === "reports" && (
            <div className="empty-state"><Flag size={48} /><p>No reports yet</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
