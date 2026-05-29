import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

export default function VoicePlayer({ src, isOwn }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onMeta = () => setDuration(el.duration || 0);
    const onTime = () => setCurrent(el.currentTime);
    const onEnd = () => { setPlaying(false); setCurrent(0); };
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  const seek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const el = audioRef.current;
    if (el) {
      el.currentTime = pct * duration;
      setCurrent(el.currentTime);
    }
  };

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const pct = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className={`voice-player ${isOwn ? "own" : "other"}`}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button className="voice-play-btn" onClick={toggle}>
        {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
      </button>
      <div className="voice-track" onClick={seek}>
        <div className="voice-track-bg" />
        <div className="voice-track-fill" style={{ width: `${pct}%` }} />
        <div className="voice-thumb" style={{ left: `${pct}%` }} />
      </div>
      <span className="voice-time">{fmt(playing ? current : duration)}</span>
    </div>
  );
}
