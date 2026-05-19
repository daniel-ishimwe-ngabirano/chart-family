import { useState, useEffect } from "react";
import axios from "../../lib/axios.js";
import { Shield, Check, Loader2 } from "lucide-react";

export default function AdminRoles() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get("/admin/roles", { params: { page } }),
      axios.get("/admin/roles/list"),
    ])
      .then(([u, r]) => {
        setUsers(u.data.users);
        setRoles(r.data);
        setTotalPages(u.data.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  const handleRoleChange = async (userId, role) => {
    try {
      await axios.put(`/admin/roles/${userId}`, { role });
      setUsers(users.map((u) => u.id === userId ? { ...u, role } : u));
    } catch (err) {
      alert(err.response?.data?.error || "Failed");
    }
  };

  if (loading) return <div className="loading-center"><Loader2 size={32} className="spin" /></div>;

  return (
    <div>
      <div className="admin-page-header">
        <h1><Shield size={24} /> Roles & Permissions</h1>
        <p>Manage user roles and access levels</p>
      </div>

      <div className="admin-section">
        <h2 className="admin-section-title">Available Roles</h2>
        <div className="admin-roles-grid">
          {roles.map((r) => (
            <div key={r.id} className="admin-role-card">
              <h3 style={{ textTransform: "capitalize" }}>{r.label}</h3>
              <div className="admin-role-perms">
                {r.permissions.map((p) => (
                  <span key={p} className="admin-perm-badge">
                    <Check size={12} /> {p.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-section">
        <h2 className="admin-section-title">Users</h2>
        <div className="admin-user-list">
          {users.map((u) => (
            <div key={u.id} className="admin-role-user-item">
              <img src={u.avatar} alt="" className="avatar" />
              <div className="admin-user-info">
                <span>{u.fullName}</span>
                <span>{u.email}</span>
              </div>
              <select
                value={u.role}
                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                className="admin-role-select"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

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
