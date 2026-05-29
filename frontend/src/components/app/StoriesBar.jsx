import { useEffect, useRef } from "react";
import { useStoryStore } from "../../stores/storyStore.js";
import { useAuthStore } from "../../stores/authStore.js";
import { handleAvatarError } from "../../utils/avatar.js";
import { Plus } from "lucide-react";

export default function StoriesBar({ onOpenCreator }) {
  const { groups, fetchStories, openViewer } = useStoryStore();
  const { authUser } = useAuthStore();
  const fetched = useRef(false);

  useEffect(() => {
    if (!fetched.current) { fetchStories(); fetched.current = true; }
    const interval = setInterval(fetchStories, 30000);
    return () => clearInterval(interval);
  }, [fetchStories]);

  const hasUnviewed = (group) => group.stories.some((s) => !s.viewed);

  return (
    <div className="stories-bar">
      <div className="stories-scroll">
        <div className="story-avatar-item my-story" onClick={onOpenCreator}>
          <div className="story-avatar-ring add-ring">
            <div className="story-avatar-img-wrap">
              <img src={authUser?.avatar || ""} alt="" onError={(e) => handleAvatarError(e, authUser?.fullName || "You")} />
              <div className="story-add-badge"><Plus size={16} /></div>
            </div>
          </div>
          <span className="story-name">Your Story</span>
        </div>
        {groups.filter((g) => g.user.id !== authUser?.id).map((group) => (
          <div key={group.user.id} className="story-avatar-item" onClick={() => openViewer(group.user.id, 0)}>
            <div className={`story-avatar-ring ${hasUnviewed(group) ? "unviewed" : "viewed"}`}>
              <div className="story-avatar-img-wrap">
                <img src={group.user.avatar || ""} alt="" onError={(e) => handleAvatarError(e, group.user.fullName)} />
              </div>
            </div>
            <span className="story-name">{group.user.fullName.split(" ")[0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
