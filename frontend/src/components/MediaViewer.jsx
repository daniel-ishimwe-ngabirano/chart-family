import { useEffect } from "react";
import { X, Download } from "lucide-react";

export default function MediaViewer({ url, mimeType, onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="media-viewer-overlay" onClick={onClose}>
      <div className="media-viewer" onClick={(e) => e.stopPropagation()}>
        <div className="media-viewer-header">
          <button onClick={onClose}><X size={24} /></button>
          <a href={url} download target="_blank" rel="noopener noreferrer">
            <Download size={22} />
          </a>
        </div>
        <div className="media-viewer-body">
          {mimeType?.startsWith("image/") ? (
            <img src={url} alt="" className="media-viewer-image" />
          ) : mimeType?.startsWith("video/") ? (
            <video src={url} controls className="media-viewer-video" autoPlay />
          ) : (
            <div className="media-viewer-file">
              <p>Preview not available</p>
              <a href={url} download target="_blank" rel="noopener noreferrer" className="btn-primary">Download File</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
