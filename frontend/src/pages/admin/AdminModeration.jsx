import { useState, useEffect } from "react";
import axios from "../../lib/axios.js";
import { Flag, ShieldAlert, Plus, X, Check, Search, Loader2 } from "lucide-react";

export default function AdminModeration() {
  const [tab, setTab] = useState("reports");
  const [reports, setReports] = useState([]);
  const [badWords, setBadWords] = useState([]);
  const [newWord, setNewWord] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab === "reports") {
      setLoading(true);
      axios.get("/admin/reports", { params: { page } })
        .then((r) => { setReports(r.data.reports); setTotalPages(r.data.totalPages); })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      axios.get("/admin/bad-words").then((r) => setBadWords(r.data)).catch(() => {});
    }
  }, [tab, page]);

  const handleResolve = async (reportId, status) => {
    if (status === "action_taken" && !confirm("This will ban the reported user. Continue?")) return;
    try {
      await axios.put(`/admin/reports/${reportId}`, { status });
      setReports(reports.map((r) => r.id === reportId ? { ...r, status } : r));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to resolve report");
    }
  };

  const addBadWord = async () => {
    if (!newWord.trim()) return;
    try {
      const res = await axios.post("/admin/bad-words", { word: newWord.trim() });
      setBadWords([...badWords, res.data]);
      setNewWord("");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add");
    }
  };

  const removeBadWord = async (id) => {
    await axios.delete(`/admin/bad-words/${id}`);
    setBadWords(badWords.filter((w) => w.id !== id));
  };

  const getStatusColor = (s) => {
    switch (s) {
      case "pending": return "#f59e0b";
      case "dismissed": return "#6b7280";
      case "action_taken": return "#ef4444";
      case "resolved": return "#22c55e";
      default: return "#6b7280";
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1><ShieldAlert size={24} /> Moderation</h1>
        <p>Manage reports, banned words, and content moderation</p>
      </div>

      <div className="admin-tabs-bar">
        <button className={`admin-tab-btn ${tab === "reports" ? "active" : ""}`} onClick={() => { setTab("reports"); setPage(1); }}>
          <Flag size={16} /> Reports
        </button>
        <button className={`admin-tab-btn ${tab === "badwords" ? "active" : ""}`} onClick={() => { setTab("badwords"); setPage(1); }}>
          <ShieldAlert size={16} /> Bad Words
        </button>
      </div>

      {tab === "reports" && (
        <div className="admin-section">
          {loading ? (
            <div className="loading-center"><Loader2 size={32} className="spin" /></div>
          ) : reports.length === 0 ? (
            <div className="admin-empty"><Flag size={48} /><p>No reports yet</p></div>
          ) : (
            <div className="admin-mod-list">
              {reports.map((r) => (
                <div key={r.id} className="admin-mod-item">
                  <div className="admin-mod-header">
                    <span className="admin-mod-badge" style={{ background: getStatusColor(r.status) }}>
                      {r.status}
                    </span>
                    <span className="admin-mod-reason">{r.reason}</span>
                  </div>
                  <div className="admin-mod-users">
                    <span>Reported by: {r.reporter?.fullName || "Unknown"}</span>
                    <span>→</span>
                    <span>Against: {r.reported?.fullName || "Unknown"}</span>
                  </div>
                  {r.description && <p className="admin-mod-desc">{r.description}</p>}
                  <div className="admin-mod-actions">
                    {r.status === "pending" && (
                      <>
                        <button className="btn-small success" onClick={() => handleResolve(r.id, "dismissed")}>
                          <X size={14} /> Dismiss
                        </button>
                        <button className="btn-small danger" onClick={() => handleResolve(r.id, "action_taken")}>
                          <Check size={14} /> Action & Ban
                        </button>
                      </>
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
      )}

      {tab === "badwords" && (
        <div className="admin-section">
          <div className="admin-badword-input">
            <input
              type="text"
              placeholder="Add bad word..."
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addBadWord()}
            />
            <button className="btn primary" onClick={addBadWord}>
              <Plus size={16} /> Add
            </button>
          </div>
          <div className="admin-badword-list">
            {badWords.map((w) => (
              <div key={w.id} className="admin-badword-item">
                <span>{w.word}</span>
                <button onClick={() => removeBadWord(w.id)}><X size={16} /></button>
              </div>
            ))}
            {badWords.length === 0 && <p className="admin-empty">No bad words added</p>}
          </div>
        </div>
      )}
    </div>
  );
}
