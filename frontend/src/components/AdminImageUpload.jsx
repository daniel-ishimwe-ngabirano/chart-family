import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import axios from "../lib/axios.js";

export default function AdminImageUpload({ value, onChange, label }) {
  const [preview, setPreview] = useState(value || "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "wavechat/admin");

    setUploading(true);
    try {
      const res = await axios.post("/admin/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data.url;
      setPreview(url);
      onChange(url);
    } catch (err) {
      alert("Upload failed: " + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview("");
    onChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="admin-image-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        hidden
      />
      {preview ? (
        <div className="admin-image-preview">
          <img src={preview} alt={label || "Preview"} />
          <button className="admin-image-remove" onClick={handleRemove} title="Remove">
            <X size={16} />
          </button>
        </div>
      ) : uploading ? (
        <div className="admin-image-placeholder uploading">
          <Loader2 size={32} className="spin" />
          <span>Uploading…</span>
        </div>
      ) : (
        <div className="admin-image-placeholder" onClick={() => fileInputRef.current?.click()}>
          <ImageIcon size={32} />
          <Upload size={20} />
          <span>Click to upload {label || "image"}</span>
        </div>
      )}
      {preview && (
        <button className="admin-image-change" onClick={() => fileInputRef.current?.click()}>
          Change Image
        </button>
      )}
    </div>
  );
}