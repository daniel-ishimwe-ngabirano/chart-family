import { useState, useEffect, useRef, useCallback } from "react";
import { useStoryStore } from "../../stores/storyStore.js";
import { handleAvatarError } from "../../utils/avatar.js";
import axios from "../../lib/axios.js";
import { X, Trash2, Eye } from "lucide-react";

export default function StoryViewer() {
  const { groups, viewingGroup, viewingIndex, closeViewer, nextStory, prevStory, viewStory, deleteStory } = useStoryStore();
  const group = groups.find((g) => g.user.id === viewingGroup);
  const story = group?.stories?.[viewingIndex];
  const [progress, setProgress] = useState(0);
  const [pause, setPause] = useState(false);
  const [showViews, setShowViews] = useState(false);
  const [views, setViews] = useState([]);
  const timerRef = useRef(null);
  const duration = story?.type === "VIDEO" ? 8000 : 5000;

  const markViewed = useCallback(async () => {
    if (story && !story.viewed) {
      await viewStory(story.id);
    }
  }, [story, viewStory]);

  useEffect(() => {
    if (!story) return;
    setProgress(0);
    markViewed();
    if (pause) return;
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(timerRef.current);
        nextStory();
      }
    }, 50);
    return () => clearInterval(timerRef.current);
  }, [story?.id, pause, duration, nextStory, markViewed]);

  const handleViewViews = async () => {
    if (!story) return;
    try {
      const res = await axios.get(`/stories/${story.id}/views`);
      setViews(res.data);
    } catch {}
    setShowViews(true);
  };

  if (!group || !story) return null;

  const isMine = story.userId === viewingGroup || true;

  const bgStyle = story.type === "TEXT" ? { backgroundColor: story.backgroundColor || "#000" } : {};

  return (
    <div className="story-viewer-overlay" onClick={closeViewer}>
      <div className="story-viewer" onClick={(e) => e.stopPropagation()}>
        <div className="story-progress-bar">
          {group.stories.map((s, i) => (
            <div key={s.id} className="story-progress-segment">
              <div className="story-progress-track">
                <div className={`story-progress-fill ${i < viewingIndex ? "done" : i === viewingIndex ? "active" : ""}`}
                  style={i === viewingIndex ? { width: `${progress}%` } : i < viewingIndex ? { width: "100%" } : { width: "0%" }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="story-viewer-header">
          <div className="story-viewer-user">
            <img src={group.user.avatar || ""} alt="" onError={(e) => handleAvatarError(e, group.user.fullName)} />
            <div>
              <strong>{group.user.fullName}</strong>
              <span>{new Date(story.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>
          <div className="story-viewer-actions">
            {story.userId === viewingGroup && (
              <button onClick={() => { deleteStory(story.id); closeViewer(); }} title="Delete">
                <Trash2 size={18} />
              </button>
            )}
            <button onClick={handleViewViews} title="Views"><Eye size={18} /></button>
            <button onClick={closeViewer}><X size={22} /></button>
          </div>
        </div>

        <div className="story-viewer-body" style={bgStyle}
          onMouseDown={() => setPause(true)}
          onMouseUp={() => setPause(false)}
          onTouchStart={() => setPause(true)}
          onTouchEnd={() => setPause(false)}
        >
          <div className="story-nav-area left" onClick={(e) => { e.stopPropagation(); prevStory(); }} />
          <div className="story-nav-area right" onClick={(e) => { e.stopPropagation(); nextStory(); }} />

          {story.type === "TEXT" ? (
            <div className="story-text-display" style={{ color: story.textColor || "#fff" }}>
              {story.caption}
            </div>
          ) : story.type === "VIDEO" ? (
            <video src={story.media} autoPlay playsInline className="story-media-display" />
          ) : (
            <img src={story.media} alt="" className="story-media-display" />
          )}

          {story.caption && story.type !== "TEXT" && (
            <div className="story-caption-overlay">{story.caption}</div>
          )}
        </div>
      </div>

      {showViews && (
        <div className="story-views-modal" onClick={() => setShowViews(false)}>
          <div className="story-views-content" onClick={(e) => e.stopPropagation()}>
            <div className="story-views-header">
              <h4>Views</h4>
              <button onClick={() => setShowViews(false)}><X size={18} /></button>
            </div>
            <div className="story-views-list">
              {views.map((v) => (
                <div key={v.id} className="story-view-item">
                  <img src={v.viewer.avatar || ""} alt="" onError={(e) => handleAvatarError(e, v.viewer.fullName)} />
                  <span>{v.viewer.fullName}</span>
                  <small>{new Date(v.viewedAt).toLocaleString()}</small>
                </div>
              ))}
              {views.length === 0 && <p className="no-views">No views yet</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
