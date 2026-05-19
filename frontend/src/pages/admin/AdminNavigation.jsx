import { useState, useEffect } from "react";
import axios from "../../lib/axios.js";
import { Menu, Plus, Trash2, Eye, EyeOff, GripVertical, Loader2 } from "lucide-react";

export default function AdminNavigation() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "", path: "/", icon: "", role: "user", parentId: "" });

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/admin/nav-items");
      setItems(res.data);
    } catch {}
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.label || !form.path) return;
    try {
      await axios.post("/admin/nav-items", form);
      setForm({ label: "", path: "/", icon: "", role: "user", parentId: "" });
      setShowForm(false);
      loadItems();
    } catch (err) {
      alert(err.response?.data?.error || "Failed");
    }
  };

  const handleToggleVisibility = async (item) => {
    try {
      await axios.put(`/admin/nav-items/${item.id}`, { isVisible: !item.isVisible });
      loadItems();
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this nav item?")) return;
    await axios.delete(`/admin/nav-items/${id}`);
    loadItems();
  };

  const handleMoveUp = async (item, index) => {
    if (index === 0) return;
    const siblings = items.filter((i) => i.parentId === item.parentId);
    const prev = siblings[index - 1];
    if (!prev) return;
    await axios.put("/admin/nav-items/reorder", {
      items: [
        { id: item.id, position: prev.position },
        { id: prev.id, position: item.position },
      ],
    });
    loadItems();
  };

  if (loading) return <div className="loading-center"><Loader2 size={32} className="spin" /></div>;

  return (
    <div>
      <div className="admin-page-header">
        <h1><Menu size={24} /> Navigation Builder</h1>
        <p>Manage sidebar, navbar items, and footer links</p>
      </div>

      <button className="btn primary" onClick={() => setShowForm(!showForm)} style={{ marginBottom: 20 }}>
        <Plus size={18} /> Add Nav Item
      </button>

      {showForm && (
        <form onSubmit={handleCreate} className="admin-nav-form">
          <div className="admin-nav-field">
            <label>Label</label>
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Chats" />
          </div>
          <div className="admin-nav-field">
            <label>Path</label>
            <input value={form.path} onChange={(e) => setForm({ ...form, path: e.target.value })} placeholder="/chat" />
          </div>
          <div className="admin-nav-field">
            <label>Icon name</label>
            <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="MessageSquare" />
          </div>
          <div className="admin-nav-field">
            <label>Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="user">All Users</option>
              <option value="admin">Admin Only</option>
              <option value="moderator">Moderator+</option>
            </select>
          </div>
          <button type="submit" className="btn primary">Add</button>
        </form>
      )}

      <div className="admin-nav-list">
        {items.filter((i) => !i.parentId).map((item, idx) => (
          <div key={item.id} className="admin-nav-item-row">
            <div className="admin-nav-item-main">
              <GripVertical size={16} className="admin-nav-grip" />
              <span className="admin-nav-label">{item.label}</span>
              <code className="admin-nav-path">{item.path}</code>
              <span className="admin-nav-role">{item.role}</span>
            </div>
            <div className="admin-nav-actions">
              <button onClick={() => handleToggleVisibility(item)} title={item.isVisible ? "Hide" : "Show"}>
                {item.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <button onClick={() => handleMoveUp(item, idx)} disabled={idx === 0} title="Move up">
                ↑
              </button>
              <button onClick={() => handleDelete(item.id)} title="Delete">
                <Trash2 size={16} />
              </button>
            </div>
            {item.children?.length > 0 && (
              <div className="admin-nav-children">
                {item.children.map((child) => (
                  <div key={child.id} className="admin-nav-item-row child">
                    <div className="admin-nav-item-main">
                      <span className="admin-nav-label">{child.label}</span>
                      <code className="admin-nav-path">{child.path}</code>
                    </div>
                    <div className="admin-nav-actions">
                      <button onClick={() => handleDelete(child.id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
