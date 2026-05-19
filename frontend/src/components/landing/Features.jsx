import { useTranslate } from "../../hooks/useTranslate.js";
import { MessageCircle, Phone, Users, Shield, FileImage, Globe, Zap, Lock, Smile } from "lucide-react";

const features = [
  { icon: <Zap size={28} />, titleKey: "landing.featureRealtime", titleDefault: "Real-Time Messaging", descKey: "landing.featureRealtimeDesc", descDefault: "Messages appear instantly. No refresh needed." },
  { icon: <Phone size={28} />, titleKey: "landing.featureVoice", titleDefault: "Voice & Video Calls", descKey: "landing.featureVoiceDesc", descDefault: "Crystal-clear calls with WebRTC." },
  { icon: <Users size={28} />, titleKey: "landing.featureGroups", titleDefault: "Group Chats", descKey: "landing.featureGroupsDesc", descDefault: "Groups up to 200 members with roles and polls." },
  { icon: <Shield size={28} />, titleKey: "landing.featureSecurity", titleDefault: "End-to-End Security", descKey: "landing.featureSecurityDesc", descDefault: "Your messages are encrypted. Privacy by default." },
  { icon: <FileImage size={28} />, titleKey: "landing.featureFiles", titleDefault: "File Sharing", descKey: "landing.featureFilesDesc", descDefault: "Share images, videos, documents up to 50MB." },
  { icon: <Globe size={28} />, titleKey: "landing.featureCommunities", titleDefault: "Communities", descKey: "landing.featureCommunitiesDesc", descDefault: "Create channels and communities for your team." },
  { icon: <Smile size={28} />, titleKey: "landing.featureReactions", titleDefault: "Reactions & Stickers", descKey: "landing.featureReactionsDesc", descDefault: "Express yourself with emoji reactions and GIFs." },
  { icon: <Lock size={28} />, titleKey: "landing.featurePrivacy", titleDefault: "Privacy Controls", descKey: "landing.featurePrivacyDesc", descDefault: "Control who sees your online status." },
];

export default function Features() {
  const t = useTranslate();

  return (
    <section className="features-section" id="features">
      <div className="features-header">
        <h2>{t("landing.features", "Everything you need to communicate")}</h2>
        <p>{t("landing.featuresDesc", "Powerful features wrapped in a beautiful interface")}</p>
      </div>
      <div className="features-grid">
        {features.map((f, i) => (
          <div key={i} className="feature-card glass">
            <div className="feature-icon">{f.icon}</div>
            <h3>{t(f.titleKey, f.titleDefault)}</h3>
            <p>{t(f.descKey, f.descDefault)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
