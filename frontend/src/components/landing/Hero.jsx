import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "../../lib/axios.js";
import { useTranslate } from "../../hooks/useTranslate.js";
import { MessageCircle, Shield, Zap, Users, ArrowRight } from "lucide-react";

function formatCount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(".0", "") + "M+";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".0", "") + "K+";
  return n + "+";
}

export default function Hero() {
  const t = useTranslate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    axios.get("/public/stats")
      .then((res) => setStats(res.data))
      .catch(() => setStats({ totalUsers: 0, totalMessages: 0 }));
  }, []);

  const totalUsers = stats ? formatCount(stats.totalUsers) : "—";
  const totalMessages = stats ? formatCount(stats.totalMessages) : "—";

  return (
    <section className="hero-section" id="about">
      <div className="hero-bg">
        <div className="hero-glow glow-1" />
        <div className="hero-glow glow-2" />
      </div>
      <div className="hero-content">
        <div className="hero-text">
          <div className="hero-badge">
            <Zap size={14} />
            {t("landing.realtimeBadge", "Real-time messaging platform")}
          </div>
          <h1 className="hero-title">
            {t("landing.heroTitle", "Chat Smarter. Connect Faster.")}
          </h1>
          <p className="hero-subtitle">
            {t("landing.heroSubtitle", "Fast, secure, real-time messaging platform for everyone.")}
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn-primary btn-lg">
              {t("landing.getStarted", "Start Chatting")} <ArrowRight size={20} />
            </Link>
            <a href="/api/auth/google" className="btn-google btn-lg">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t("auth.google", "Continue with Google")}
            </a>
          </div>
          <div className="hero-stats">
            <div className="stat"><strong>{totalUsers}</strong> {t("landing.activeUsers", "Active Users")}</div>
            <div className="stat"><strong>{totalMessages}</strong> {t("landing.messagesSent", "Messages Sent")}</div>
            <div className="stat"><strong>99.9%</strong> {t("landing.uptime", "Uptime")}</div>
          </div>
        </div>
        <div className="hero-preview">
          <div className="preview-card">
            <div className="preview-header">
              <div className="preview-dots"><span /><span /><span /></div>
              <span>WaveChat</span>
            </div>
            <div className="preview-chat">
              <div className="preview-msg received">
                <div className="msg-avatar" />
                <div className="msg-content">
                  <div className="msg-name">Alice</div>
                  <div className="msg-text">{t("landing.previewWelcome", "Hey! Welcome to WaveChat")}</div>
                </div>
              </div>
              <div className="preview-msg sent">
                <div className="msg-content">
                  <div className="msg-text">{t("landing.previewReply", "This looks amazing!")}</div>
                </div>
              </div>
              <div className="preview-msg received">
                <div className="msg-avatar" />
                <div className="msg-content">
                  <div className="msg-name">Bob</div>
                  <div className="msg-text">{t("landing.previewRealtime", "The real-time is incredible")}</div>
                </div>
              </div>
              <div className="typing-indicator"><span /><span /><span /> {t("landing.previewTyping", "Typing...")}</div>
            </div>
            <div className="preview-status">
              <Users size={14} /> <strong>24</strong> {t("landing.onlineNow", "online now")}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
