import { useState, useEffect } from "react";
import axios from "../../lib/axios.js";
import { Megaphone, Plus, Trash2, Loader2 } from "lucide-react";

export default function AdminBroadcasts() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    setLoading(true);
    axios.get("/admin/broadcasts", { params: { page } })
      .then((r) => { setBroadcasts(r.data.broadcasts); setTotalPages(r.data.totalPages); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title || !message) return;
    try {
      const res = await axios.post("/admin/broadcasts", { title, message, type });
      setBroadcasts([res.data, ...broadcasts]);
      setTitle("");
      setMessage("");
      setShowForm(false);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create");
    }
  };

  const handleDelete = async (id) => {
    await axios.delete(`/admin/broadcasts/${id}`);
    setBroadcasts(broadcasts.filter((b) => b.id !== id));
  };

  const typeColors = {
    info: "#3b82f6",
    warning: "#f59e0b",
    alert: "#ef4444",
    promotion: "#22c55e",
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1><Megaphone size={24} /> Broadcasts</h1>
        <p>Send global notifications to all users</p>
      </div>

      <button className="btn primary" onClick={() => setShowForm(!showForm)} style={{ marginBottom: 20 }}>
        <Plus size={18} /> New Broadcast
      </button>

      {showForm && (
        <form onSubmit={handleCreate} className="admin-broadcast-form">
          <div className="admin-broadcast-field">
            <label>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. New Feature Launch" />
          </div>
          <div className="admin-broadcast-field">
            <label>Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Broadcast message..." rows={3} />
          </div>
          <div className="admin-broadcast-field">
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="alert">Alert</option>
              <option value="promotion">Promotion</option>
            </select>
          </div>
          <button type="submit" className="btn primary">Send Broadcast</button>
        </form>
      )}

      {loading ? (
        <div className="loading-center"><Loader2 size={32} className="spin" /></div>
      ) : broadcasts.length === 0 ? (
        <div className="admin-empty"><Megaphone size={48} /><p>No broadcasts sent</p></div>
      ) : (
        <div className="admin-broadcast-list">
          {broadcasts.map((b) => (
            <div key={b.id} className="admin-broadcast-item" style={{ borderLeft: `3px solid ${typeColors[b.type] || "#6b7280"}` }}>
              <div className="admin-broadcast-header">
                <span className="admin-broadcast-type" style={{ background: typeColors[b.type] }}>{b.type}</span>
                <h3>{b.title}</h3>
                <div className="admin-broadcast-meta">
                  <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                  <span>{b._count?.reads || 0} reads</span>
                </div>
              </div>
              <p className="admin-broadcast-msg">{b.message}</p>
              <button className="admin-broadcast-delete" onClick={() => handleDelete(b.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="admin-pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
