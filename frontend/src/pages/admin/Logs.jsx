import { useState, useEffect } from "react";
import axios from "../../lib/axios.js";
import { Loader2, Clock } from "lucide-react";

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios.get("/admin/logs", { params: { page } })
      .then((r) => {
        setLogs(r.data.logs);
        setTotalPages(r.data.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  const formatAction = (action) => {
    return action
      .replace(/\./g, " ")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1>Audit Log</h1>
        <p>Track all admin actions and system changes</p>
      </div>

      {loading ? (
        <div className="loading-center"><Loader2 size={32} className="spin" /></div>
      ) : logs.length === 0 ? (
        <div className="admin-empty">
          <Clock size={48} />
          <p>No audit logs yet</p>
        </div>
      ) : (
        <div className="admin-logs-list">
          {logs.map((log) => (
            <div key={log.id} className="admin-log-item">
              <div className="admin-log-avatar">
                {log.user?.avatar ? (
                  <img src={log.user.avatar} alt="" />
                ) : (
                  <div className="admin-log-avatar-placeholder">
                    {log.user?.fullName?.charAt(0) || "?"}
                  </div>
                )}
              </div>
              <div className="admin-log-content">
                <div className="admin-log-header">
                  <span className="admin-log-user">{log.user?.fullName || "Unknown"}</span>
                  <span className="admin-log-action">{formatAction(log.action)}</span>
                </div>
                <div className="admin-log-meta">
                  <span>{log.resource}</span>
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                {log.details && (
                  <pre className="admin-log-details">{log.details}</pre>
                )}
              </div>
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
