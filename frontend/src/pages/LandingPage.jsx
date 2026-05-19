import { useState, useEffect } from "react";
import Navbar from "../components/landing/Navbar.jsx";
import Hero from "../components/landing/Hero.jsx";
import Features from "../components/landing/Features.jsx";
import Footer from "../components/landing/Footer.jsx";

function renderContent(text) {
  if (!text) return null;
  return text.split(/\n\n+/).map((paragraph, i) => {
    const trimmed = paragraph.trim();
    if (!trimmed) return null;
    return <p key={i}>{trimmed}</p>;
  });
}

export default function LandingPage() {
  const [sections, setSections] = useState([]);

  const fetchSections = () => {
    fetch("/api/public/page-sections")
      .then((r) => r.json())
      .then((data) => setSections(Array.isArray(data) ? data : []))
      .catch(() => setSections([]));
  };

  useEffect(() => {
    fetchSections();
    const handler = () => fetchSections();
    window.addEventListener("sections:updated", handler);
    return () => window.removeEventListener("sections:updated", handler);
  }, []);

  return (
    <div className="landing-page">
      <Navbar />
      <Hero />
      <Features />

      {sections.map((section) => (
        <section key={section.slug} id={section.slug} className="landing-dynamic-section">
          <div className="dynamic-section-inner">
            <h2 className="dynamic-section-title">{section.title}</h2>
            <div className="dynamic-section-content">
              {renderContent(section.content)}
            </div>
          </div>
        </section>
      ))}

      <Footer />
    </div>
  );
}
