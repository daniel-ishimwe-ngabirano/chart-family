import { useState } from "react";
import { useChatStore } from "../stores/chatStore.js";
import { X, Search, Check, Loader2, Users } from "lucide-react";
import axios from "../lib/axios.js";

export default function GroupModal({ onClose }) {
  const { users, setSelectedConversation } = useChatStore();
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [creating, setCreating] = useState(false);

  const filtered = users.filter(
    (u) => u.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUser = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selected.size < 1) return;
    setCreating(true);
    try {
      const res = await axios.post("/groups", {
        groupName: groupName.trim(),
        participantIds: Array.from(selected),
      });
      setSelectedConversation(res.data);
      onClose();
    } catch (err) {
      console.error("Create group failed:", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content group-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Group</h2>
          <button onClick={onClose}><X size={22} /></button>
        </div>

        <div className="modal-body">
          <div className="input-group">
            <label>Group Name</label>
            <input
              type="text"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="search-bar" style={{ margin: "12px 0" }}>
            <Search size={18} />
            <input
              type="text"
              placeholder="Search participants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="participants-info">
            <Users size={16} />
            <span>{selected.size} participant{selected.size !== 1 ? "s" : ""} selected</span>
          </div>

          <div className="user-select-list">
            {filtered.map((user) => (
              <div
                key={user.id}
                className={`user-select-item ${selected.has(user.id) ? "selected" : ""}`}
                onClick={() => toggleUser(user.id)}
              >
                <img src={user.avatar} alt="" className="avatar" />
                <span>{user.fullName}</span>
                {selected.has(user.id) && <Check size={18} className="check-icon" />}
              </div>
            ))}
          </div>

          <button
            className="btn-primary"
            onClick={handleCreate}
            disabled={creating || !groupName.trim() || selected.size < 1}
            style={{ marginTop: 16 }}
          >
            {creating ? <Loader2 size={20} className="spin" /> : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}
