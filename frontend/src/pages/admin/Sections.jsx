import { useEffect, useState } from "react";
import { usePageSectionStore } from "../../stores/pageSectionStore.js";
import { Save, Loader2, Eye, EyeOff, Info } from "lucide-react";

const SECTION_META = {
  about: {
    label: "About",
    desc: "Shown when visitors click About or Blog in the footer",
    placeholder: "WaveChat is a modern messaging platform built for speed and privacy.\n\nOur mission is to connect people everywhere through secure, real-time communication."
  },
  contact: {
    label: "Contact",
    desc: "Shown when visitors click Contact, Privacy, Terms or Security in the footer",
    placeholder: "Have questions? Reach out to us at support@wavechat.com\n\nVisit our office at 123 Tech Street, San Francisco, CA 94102"
  },
};

const DEFAULT_SLUGS = ["about", "contact"];

export default function AdminSections() {
  const { sections, loading, fetchSections, upsertSection } = usePageSectionStore();
  const [edit, setEdit] = useState({});
  const [saving, setSaving] = useState({});
  const [message, setMessage] = useState(null);

  useEffect(() => { fetchSections(); }, []);

  useEffect(() => {
    const map = {};
    sections.forEach((s) => { map[s.slug] = s; });
    setEdit((prev) => {
      const next = { ...prev };
      for (const slug of DEFAULT_SLUGS) {
        if (map[slug]) next[slug] = { title: map[slug].title, content: map[slug].content, published: map[slug].published };
        else if (!next[slug]) next[slug] = { title: "", content: "", published: false };
      }
      return next;
    });
  }, [sections]);

  const handleSave = async (slug) => {
    setSaving((s) => ({ ...s, [slug]: true }));
    setMessage(null);
    const data = edit[slug];
    const result = await upsertSection(slug, data);
    if (result.success) {
      setMessage({ type: "success", text: `${SECTION_META[slug]?.label || slug} saved` });
    } else {
      setMessage({ type: "error", text: result.error });
    }
    setSaving((s) => ({ ...s, [slug]: false }));
    setTimeout(() => setMessage(null), 3000);
  };

  if (loading && sections.length === 0) {
    return <div className="loading-center"><Loader2 size={32} className="spin" /></div>;
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1>Landing Page Content</h1>
        <p>Edit what visitors see when they click links in the footer</p>
      </div>

      {message && (
        <div className={`admin-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {DEFAULT_SLUGS.map((slug) => {
        const meta = SECTION_META[slug];
        const data = edit[slug];
        if (!data) return null;
        return (
          <div key={slug} className="admin-section">
            <div className="admin-section-header">
              <h2 className="admin-section-title">{meta?.label || slug}</h2>
              <p className="admin-section-desc">{meta?.desc}</p>
            </div>
            <div className="admin-section-form">
              <div className="admin-setting-item">
                <label className="admin-setting-label">Heading</label>
                <input
                  className="admin-input"
                  type="text"
                  value={data.title}
                  onChange={(e) => setEdit({ ...edit, [slug]: { ...data, title: e.target.value } })}
                  placeholder={`e.g. About ${meta?.label || slug}`}
                />
              </div>
              <div className="admin-setting-item">
                <label className="admin-setting-label">Body text</label>
                <div className="admin-field-hint">
                  <Info size={14} />
                  <span>Just type plain text. Blank lines create new paragraphs — no code needed.</span>
                </div>
                <textarea
                  className="admin-textarea"
                  rows={8}
                  value={data.content}
                  onChange={(e) => setEdit({ ...edit, [slug]: { ...data, content: e.target.value } })}
                  placeholder={meta?.placeholder}
                />
              </div>
              <div className="admin-setting-item">
                <label className="admin-setting-label">Show on landing page</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <label className="admin-switch">
                    <input
                      type="checkbox"
                      checked={data.published}
                      onChange={(e) => setEdit({ ...edit, [slug]: { ...data, published: e.target.checked } })}
                    />
                    <span className="admin-switch-slider" />
                  </label>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, color: data.published ? "#22c55e" : "#6b7280", fontSize: 14 }}>
                    {data.published ? <Eye size={16} /> : <EyeOff size={16} />}
                    {data.published ? "Visible" : "Hidden"}
                  </span>
                </div>
              </div>
            </div>
            <div className="admin-actions-bar" style={{ justifyContent: "flex-end" }}>
              <button className="btn primary" onClick={() => handleSave(slug)} disabled={saving[slug]}>
                {saving[slug] ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
                Save {meta?.label || slug}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
