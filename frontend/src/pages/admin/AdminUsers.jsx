import { useState, useEffect, useCallback, useRef } from "react";
import axios from "../../lib/axios.js";
import { Users, Plus, Search, Pencil, Trash2, Ban, Check, X, Loader2, ArrowLeft, ArrowRight, Shield } from "lucide-react";
import { handleAvatarError } from "../../utils/avatar.js";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [showModal, setShowModal] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", username: "", role: "user" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const prevSearch = useRef(search);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    setError(null);
    axios.get("/admin/users", { params: { page, limit: 15, search } })
      .then((r) => { setUsers(r.data.users); setTotalPages(r.data.totalPages); })
      .catch(() => setError("Failed to load users"))
      .finally(() => setLoading(false));
  }, [page, search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchTrigger((t) => t + 1);
    setPage(1);
  };

  useEffect(() => { fetchUsers(); }, [page, searchTrigger]);

  const openCreate = () => {
    setForm({ fullName: "", email: "", password: "", username: "", role: "user" });
    setError(null);
    setShowModal("create");
  };

  const openEdit = (user) => {
    setForm({ fullName: user.fullName, email: user.email, password: "", username: user.username || "", role: user.role });
    setEditUser(user);
    setError(null);
    setShowModal("edit");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (showModal === "create") {
        await axios.post("/admin/users", form);
      } else {
        const payload = { fullName: form.fullName, email: form.email, username: form.username, role: form.role };
        if (form.password) payload.password = form.password;
        await axios.put(`/admin/users/${editUser.id}`, payload);
      }
      setShowModal(null);
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Delete user "${user.fullName}" (${user.email})? This cannot be undone.`)) return;
    try {
      await axios.delete(`/admin/users/${user.id}`);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || "Delete failed");
    }
  };

  const handleBan = async (user) => {
    if (!confirm(`Ban user "${user.fullName}" (${user.email})? They will lose access immediately.`)) return;
    try {
      await axios.post(`/admin/users/${user.id}/ban`, { reason: "Banned by admin" });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || "Ban failed");
    }
  };

  const handleUnban = async (user) => {
    if (!confirm(`Unban user "${user.fullName}" (${user.email})?`)) return;
    try {
      await axios.post(`/admin/users/${user.id}/unban`);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || "Unban failed");
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1><Users size={24} /> Users</h1>
        <p>Manage all registered users</p>
      </div>

      <div className="admin-toolbar">
        <form onSubmit={handleSearch} className="admin-search">
          <Search size={18} />
          <input placeholder="Search by name, email, username..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </form>
        <button className="admin-btn-primary" onClick={openCreate}><Plus size={18} /> Create User</button>
      </div>

      {error && !showModal && <div className="admin-message error">{error}</div>}

      <div className="admin-table-wrap">
        {loading ? (
          <div className="loading-center"><Loader2 size={32} className="spin" /></div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="admin-user-cell">
                    <img src={u.avatar || "/default-avatar.svg"} alt="" className="admin-user-avatar" onError={(e) => handleAvatarError(e, u.fullName)} />
                    {u.fullName}
                  </td>
                  <td>{u.email}</td>
                  <td>@{u.username}</td>
                  <td><span className={`admin-role-badge role-${u.role}`}>{u.role}</span></td>
                  <td>{u.isOnline ? <span className="admin-status online">Online</span> : <span className="admin-status offline">Offline</span>}</td>
                  <td>
                    <div className="admin-action-btns">
                      <button className="admin-icon-btn" title="Edit" onClick={() => openEdit(u)}><Pencil size={16} /></button>
                      {u.role !== "admin" && (
                        <>
                          {u.role === "banned" ? (
                            <button className="admin-icon-btn" title="Unban" onClick={() => handleUnban(u)}><Check size={16} /></button>
                          ) : (
                            <button className="admin-icon-btn" title="Ban" onClick={() => handleBan(u)}><Ban size={16} /></button>
                          )}
                          <button className="admin-icon-btn danger" title="Delete" onClick={() => handleDelete(u)}><Trash2 size={16} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} className="admin-empty">No users found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="admin-pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}><ArrowLeft size={18} /></button>
          <span>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ArrowRight size={18} /></button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(null); setEditUser(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{showModal === "create" ? "Create User" : "Edit User"}</h2>
              <button onClick={() => { setShowModal(null); setEditUser(null); }}><X size={22} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body admin-user-form">
              {error && <div className="admin-message error">{error}</div>}
              <div className="input-group">
                <label>Full Name</label>
                <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
              </div>
              <div className="input-group">
                <label>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="input-group">
                <label>Username</label>
                <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </div>
              <div className="input-group">
                <label>{showModal === "create" ? "Password" : "New Password (leave blank to keep)"}</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={showModal === "create"} minLength={6} />
              </div>
              <div className="input-group">
                <label>Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="manager">Manager</option>
                  <option value="support">Support</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="edit-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowModal(null); setEditUser(null); }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? <Loader2 size={18} className="spin" /> : <Shield size={18} />}
                  {showModal === "create" ? "Create User" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
