import { useEffect } from "react";
import { useFeatureStore } from "../../stores/featureStore.js";
import { ToggleLeft, ToggleRight, Loader2 } from "lucide-react";

export default function AdminFeatures() {
  const { features, loading, fetchFeatures, toggleFeature } = useFeatureStore();

  useEffect(() => {
    fetchFeatures();
  }, []);

  const handleToggle = async (name, currentlyEnabled) => {
    await toggleFeature(name, !currentlyEnabled);
  };

  const grouped = features.reduce((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {});

  if (loading && features.length === 0) {
    return <div className="loading-center"><Loader2 size={32} className="spin" /></div>;
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1>Feature Flags</h1>
        <p>Enable or disable features dynamically — no deployment required</p>
      </div>

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="admin-section">
          <h2 className="admin-section-title" style={{ textTransform: "capitalize" }}>
            {category}
          </h2>
          <div className="admin-feature-list">
            {items.map((feature) => (
              <div key={feature.id} className="admin-feature-item">
                <div className="admin-feature-info">
                  <span className="admin-feature-label">{feature.label}</span>
                  {feature.description && (
                    <span className="admin-feature-desc">{feature.description}</span>
                  )}
                </div>
                <button
                  className={`admin-toggle ${feature.enabled ? "on" : "off"}`}
                  onClick={() => handleToggle(feature.name, feature.enabled)}
                  title={feature.enabled ? "Click to disable" : "Click to enable"}
                >
                  {feature.enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                  <span>{feature.enabled ? "Enabled" : "Disabled"}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
