import { useState, useEffect } from "react";
import { useChatStore } from "../../stores/chatStore.js";
import { useAuthStore } from "../../stores/authStore.js";
import { X, Image, FileText, Link as LinkIcon, Users, Bell, Shield, Ban, Loader2 } from "lucide-react";
import MediaViewer from "../MediaViewer.jsx";
import axios from "../../lib/axios.js";

export default function UserPanel({ onClose }) {
  const { selectedConversation } = useChatStore();
  const { authUser } = useAuthStore();
  const [tab, setTab] = useState("media");
  const [media, setMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [viewerUrl, setViewerUrl] = useState(null);
  const [viewerMime, setViewerMime] = useState(null);

  useEffect(() => {
    if (selectedConversation && (tab === "media" || tab === "files")) {
      fetchMedia();
    }
  }, [selectedConversation?.id, tab]);

  const fetchMedia = async () => {
    if (!selectedConversation) return;
    setMediaLoading(true);
    try {
      const type = tab === "files" ? "file" : "image";
      const res = await axios.get(`/conversations/${selectedConversation.id}/media?type=${type}&limit=50`);
      setMedia(res.data.media || []);
    } catch (err) {
      console.error("Failed to load media:", err);
    } finally {
      setMediaLoading(false);
    }
  };

  if (!selectedConversation) return null;

  const otherUser = selectedConversation?.isGroup ? null : selectedConversation?.members?.find((m) => m.user?.id !== authUser.id)?.user;

  return (
    <div className="user-panel">
      <div className="user-panel-header">
        <img src={otherUser?.avatar || selectedConversation?.groupAvatar || ""} alt="" className="user-panel-avatar" />
        <h3>{selectedConversation?.isGroup ? selectedConversation.groupName : otherUser?.fullName || "Unknown"}</h3>
        <button className="icon-btn" onClick={onClose}><X size={20} /></button>
      </div>

      <div className="user-panel-tabs">
        {["media", "files", "links", "members"].map((t) => (
          <button key={t} className={`up-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="user-panel-content">
        {tab === "media" && (
          <div className="up-grid">
            {mediaLoading ? (
              <div className="up-empty"><Loader2 size={24} className="spin" /></div>
            ) : media.length === 0 ? (
              <div className="up-empty">No shared media yet</div>
            ) : (
              <div className="up-media-grid">
                {media.map((item) => (
                  <div
                    key={item.id}
                    className="up-media-item"
                    onClick={() => { setViewerUrl(item.url); setViewerMime(item.mimeType); }}
                  >
                    {item.mimeType?.startsWith("video/") ? (
                      <video src={item.url} />
                    ) : (
                      <img src={item.url} alt="" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {tab === "files" && (
          <div className="up-files">
            {mediaLoading ? (
              <div className="up-empty"><Loader2 size={24} className="spin" /></div>
            ) : media.length === 0 ? (
              <div className="up-empty">No shared files</div>
            ) : (
              media.map((item) => (
                <div key={item.id} className="up-file-item">
                  <FileText size={20} />
                  <div className="up-file-info">
                    <span className="up-file-name">{item.fileName || "File"}</span>
                    <span className="up-file-size">{item.fileSize ? `${(item.fileSize / 1024).toFixed(0)} KB` : ""}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        {tab === "links" && <div className="up-empty">No shared links</div>}
        {tab === "members" && selectedConversation?.isGroup && (
          <div className="up-member-list">
            {selectedConversation.members?.map((m) => (
              <div key={m.user?.id} className="up-member">
                <img src={m.user?.avatar} alt="" className="up-member-avatar" />
                <span>{m.user?.fullName}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="user-panel-actions">
        <button className="up-action" onClick={() => alert("Mute feature coming soon")}><Bell size={18} /> Mute</button>
        <button className="up-action" onClick={() => alert("Block feature coming soon")}><Shield size={18} /> Block</button>
        <button className="up-action" onClick={() => alert("Report feature coming soon")}><Ban size={18} /> Report</button>
      </div>

      {viewerUrl && (
        <MediaViewer url={viewerUrl} mimeType={viewerMime} onClose={() => { setViewerUrl(null); setViewerMime(null); }} />
      )}
    </div>
  );
}
