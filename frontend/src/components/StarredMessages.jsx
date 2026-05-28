import { useState, useEffect } from "react";
import { X, Star, Loader2 } from "lucide-react";
import axios from "../lib/axios.js";

export default function StarredMessages({ onClose }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/users/starred/messages").then((res) => {
      setMessages(res.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const unstar = async (id) => {
    try {
      await axios.delete(`/users/starred/${id}`);
      setMessages((prev) => prev.filter((m) => m.message?.id !== id));
    } catch {}
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h2><Star size={18} /> Starred Messages</h2>
          <button onClick={onClose}><X size={22} /></button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="loading-center"><Loader2 size={24} className="spin" /></div>
          ) : messages.length === 0 ? (
            <p style={{ textAlign: "center", padding: 24, opacity: 0.6 }}>No starred messages</p>
          ) : (
            messages.map((s) => (
              <div key={s.message?.id || s.id} className="starred-item">
                <div className="starred-sender">{s.message?.sender?.fullName || "Unknown"}</div>
                <div className="starred-text">{s.message?.text || "Media"}</div>
                <div className="starred-meta">
                  {s.message?.createdAt ? new Date(s.message.createdAt).toLocaleString() : ""}
                  <button className="icon-btn" onClick={() => unstar(s.message?.id)} title="Unstar"><Star size={14} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
