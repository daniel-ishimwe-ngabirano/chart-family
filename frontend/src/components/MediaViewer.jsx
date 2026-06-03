import { useEffect, useState, useCallback } from "react";
import { X, Download, ChevronLeft, ChevronRight } from "lucide-react";

export default function MediaViewer({ attachments = [], initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex);
  const current = attachments[index];

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  const goPrev = useCallback(() => setIndex((i) => (i > 0 ? i - 1 : attachments.length - 1)), [attachments.length]);
  const goNext = useCallback(() => setIndex((i) => (i < attachments.length - 1 ? i + 1 : 0)), [attachments.length]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, onClose]);

  if (!current) return null;

  const mediaElement = current.mimeType?.startsWith("image/") ? (
    <img src={current.url} alt="" className="media-viewer-image" />
  ) : current.mimeType?.startsWith("video/") ? (
    <video
      src={current.url}
      controls
      className="media-viewer-video"
      preload="metadata"
      controlsList="nodownload"
      style={{maxWidth: '100%', maxHeight: '80vh'}}
    />
  ) : current.mimeType?.startsWith("audio/") ? (
    <div className="media-viewer-audio">
      <audio src={current.url} controls className="media-viewer-audio-player" />
      <p>Audio File</p>
    </div>
  ) : (
    <div className="media-viewer-file">
      <p>Preview not available</p>
      <a href={current.url} download target="_blank" rel="noopener noreferrer" className="btn-primary">Download File</a>
    </div>
  );

  return (
    <div className="media-viewer-overlay" onClick={onClose}>
      <div className="media-viewer" onClick={(e) => e.stopPropagation()}>
        <div className="media-viewer-header">
          <button onClick={onClose}><X size={24} /></button>
          {attachments.length > 1 && (
            <span className="media-viewer-counter">{index + 1} / {attachments.length}</span>
          )}
          <a href={current.url} download target="_blank" rel="noopener noreferrer">
            <Download size={22} />
          </a>
        </div>
        <div className="media-viewer-body">
          {mediaElement}
        </div>
        {attachments.length > 1 && (
          <>
            <button className="media-viewer-nav prev" onClick={goPrev}>
              <ChevronLeft size={32} />
            </button>
            <button className="media-viewer-nav next" onClick={goNext}>
              <ChevronRight size={32} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
