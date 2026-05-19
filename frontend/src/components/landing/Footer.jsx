import { useTranslate } from "../../hooks/useTranslate.js";
import { MessageCircle } from "lucide-react";

export default function Footer() {
  const t = useTranslate();

  return (
    <footer className="landing-footer" id="contact">
      <div className="footer-inner">
        <div className="footer-brand">
          <MessageCircle size={24} />
          <span>WaveChat</span>
          <p>{t("app.tagline", "Fast, secure, real-time messaging.")}</p>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <h4>{t("landing.product", "Product")}</h4>
            <a href="#features">{t("landing.features", "Features")}</a>
            <a href="#features">{t("landing.api", "API")}</a>
            <a href="#features">{t("landing.changelog", "Changelog")}</a>
          </div>
          <div className="footer-col">
            <h4>{t("landing.company", "Company")}</h4>
            <a href="#about">{t("landing.about", "About")}</a>
            <a href="#about">{t("landing.blog", "Blog")}</a>
            <a href="#contact">{t("landing.contact", "Contact")}</a>
          </div>
          <div className="footer-col">
            <h4>{t("landing.legal", "Legal")}</h4>
            <a href="#contact">{t("landing.privacy", "Privacy")}</a>
            <a href="#contact">{t("landing.terms", "Terms")}</a>
            <a href="#contact">{t("landing.security", "Security")}</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        &copy; {new Date().getFullYear()} WaveChat. {t("landing.footer", "All rights reserved.")}
      </div>
    </footer>
  );
}
