import { useState, useEffect } from "react";
import { useChatStore } from "../../stores/chatStore.js";
import { useAuthStore } from "../../stores/authStore.js";
import { useTranslate } from "../../hooks/useTranslate.js";
import { X, Image, FileText, Link as LinkIcon, Users, Bell, Shield, Ban, Loader2, Check } from "lucide-react";
import MediaViewer from "../MediaViewer.jsx";
import axios from "../../lib/axios.js";
import { handleAvatarError } from "../../utils/avatar.js";

export default function UserPanel({ onClose }) {
  const { selectedConversation } = useChatStore();
  const { authUser } = useAuthStore();
  const t = useTranslate();
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

  const [actionMsg, setActionMsg] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const doAction = async (type) => {
    if (!selectedConversation || actionLoading) return;
    setActionLoading(true);
    setActionMsg(null);
    try {
      const otherId = otherUser?.id;
      if (type === "mute") {
        await axios.post(`/conversations/${selectedConversation.id}/mute`, { muted: true });
        setActionMsg(t("chat.conversationMuted", "Conversation muted"));
      } else if (type === "block" && otherId) {
        await axios.post(`/users/block/${otherId}`);
        setActionMsg(t("chat.userBlocked", "User blocked"));
      } else if (type === "report" && otherId) {
        await axios.post("/users/report", { reportedId: otherId, reason: "Reported" });
        setActionMsg(t("chat.userReported", "User reported"));
      }
    } catch (err) {
      setActionMsg(err.response?.data?.error || t("chat.actionFailed", "Action failed"));
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMsg(null), 3000);
    }
  };

  if (!selectedConversation) return null;

  const otherUser = selectedConversation?.isGroup ? null : selectedConversation?.members?.find((m) => m.user?.id !== authUser.id)?.user;

  return (
    <div className="user-panel">
      <div className="user-panel-header">
        <img src={otherUser?.avatar || selectedConversation?.groupAvatar || ""} alt="" className="user-panel-avatar" onError={(e) => handleAvatarError(e, selectedConversation?.isGroup ? selectedConversation.groupName : otherUser?.fullName || t("common.unknown", "Unknown"))} />
        <h3>{selectedConversation?.isGroup ? selectedConversation.groupName : otherUser?.fullName || t("common.unknown", "Unknown")}</h3>
        <button className="icon-btn" onClick={onClose}><X size={20} /></button>
      </div>

      <div className="user-panel-tabs">
        {["media", "files", "links", "members"].map((tabKey) => (
          <button key={tabKey} className={`up-tab ${tab === tabKey ? "active" : ""}`} onClick={() => setTab(tabKey)}>{t(`chat.${tabKey}Tab`, tabKey)}</button>
        ))}
      </div>

      <div className="user-panel-content">
        {tab === "media" && (
          <div className="up-grid">
            {otherUser?.avatar && (
              <div className="up-avatar-section">
                <div
                  className="up-avatar-item"
                  onClick={() => { setViewerUrl(otherUser.avatar); setViewerMime("image/jpeg"); }}
                >
                  <img src={otherUser.avatar} alt="" />
                </div>
                <span className="up-avatar-label">{t("chat.profilePhoto", "Profile Photo")}</span>
              </div>
            )}
            {mediaLoading ? (
              <div className="up-empty"><Loader2 size={24} className="spin" /></div>
            ) : media.length === 0 ? (
              !otherUser?.avatar && <div className="up-empty">{t("chat.noSharedMedia", "No shared media yet")}</div>
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
              <div className="up-empty">{t("chat.noSharedFiles", "No shared files")}</div>
            ) : (
              media.map((item) => (
                <div key={item.id} className="up-file-item">
                  <FileText size={20} />
                  <div className="up-file-info">
                    <span className="up-file-name">{item.fileName || t("common.file", "File")}</span>
                    <span className="up-file-size">{item.fileSize ? `${(item.fileSize / 1024).toFixed(0)} KB` : ""}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        {tab === "links" && <div className="up-empty">{t("chat.noSharedLinks", "No shared links")}</div>}
        {tab === "members" && selectedConversation?.isGroup && (
          <div className="up-member-list">
            {selectedConversation.members?.map((m) => {
              const isMe = m.user?.id === authUser.id;
              const isAdmin = selectedConversation.members?.find((me) => me.userId === authUser.id)?.role === "admin";
              return (
                <div key={m.user?.id} className="up-member">
                  <img src={m.user?.avatar} alt="" className="up-member-avatar" onError={(e) => handleAvatarError(e, m.user?.fullName)} />
                  <div className="up-member-info">
                    <span className="up-member-name">{m.user?.fullName}{isMe ? t("chat.you", " (you)") : ""}</span>
                    {m.role === "admin" && <span className="up-member-role">{t("chat.admin", "admin")}</span>}
                  </div>
                  {isAdmin && !isMe && (
                    <button className="icon-btn" title={t("chat.remove", "Remove")} onClick={async () => {
                      try {
                        await axios.delete(`/groups/${selectedConversation.id}/members/${m.user?.id}`);
                        useChatStore.getState().getConversations();
                      } catch {}
                    }}><X size={14} /></button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="user-panel-actions">
        {actionMsg && <div className="up-action-msg">{actionMsg}</div>}
        <button className="up-action" onClick={() => doAction("mute")} disabled={actionLoading}><Bell size={18} /> {actionLoading ? "..." : t("chat.mute", "Mute")}</button>
        {selectedConversation?.isGroup && (
            <button className="up-action" onClick={async () => {
            if (actionLoading) return;
            setActionLoading(true);
            try {
              await axios.post(`/groups/${selectedConversation.id}/leave`);
              useChatStore.getState().setSelectedConversation(null);
              useChatStore.getState().getConversations();
              onClose();
            } catch (err) {
              setActionMsg(err.response?.data?.error || t("chat.failedToLeaveGroup", "Failed to leave group"));
            } finally {
              setActionLoading(false);
              setTimeout(() => setActionMsg(null), 3000);
            }
          }} disabled={actionLoading}><X size={18} /> {actionLoading ? "..." : t("chat.leaveGroup", "Leave Group")}</button>
        )}
        {otherUser && (
          <>
            <button className="up-action" onClick={() => doAction("block")} disabled={actionLoading}><Shield size={18} /> {actionLoading ? "..." : t("chat.block", "Block")}</button>
            <button className="up-action" onClick={() => doAction("report")} disabled={actionLoading}><Ban size={18} /> {actionLoading ? "..." : t("chat.report", "Report")}</button>
          </>
        )}
      </div>

      {viewerUrl && (
        <MediaViewer url={viewerUrl} mimeType={viewerMime} onClose={() => { setViewerUrl(null); setViewerMime(null); }} />
      )}
    </div>
  );
}
