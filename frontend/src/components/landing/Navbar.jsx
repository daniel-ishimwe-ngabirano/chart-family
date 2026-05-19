import { useState } from "react";
import { Link } from "react-router-dom";
import { useThemePrefStore } from "../../stores/themePrefStore.js";
import { useLocaleStore, locales_list } from "../../stores/localeStore.js";
import { useTranslate } from "../../hooks/useTranslate.js";
import { MessageCircle, Sun, Moon, Globe, Menu, X } from "lucide-react";

export default function Navbar() {
  const { theme, toggleTheme } = useThemePrefStore();
  const { locale, setLocale } = useLocaleStore();
  const t = useTranslate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="landing-navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <MessageCircle size={28} className="brand-icon" />
          <span className="brand-name">WaveChat</span>
        </Link>

        <div className={`navbar-links ${mobileOpen ? "open" : ""}`}>
          <Link to="/login" className="nav-link">{t("auth.login", "Login")}</Link>
          <Link to="/register" className="btn-primary nav-btn">{t("landing.getStarted", "Get Started")}</Link>
          <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className="lang-selector">
            <Globe size={18} />
            <select value={locale} onChange={(e) => setLocale(e.target.value)}>
              {locales_list.map((l) => (
                <option key={l.code} value={l.code}>{l.native}</option>
              ))}
            </select>
          </div>
        </div>

        <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </nav>
  );
}
