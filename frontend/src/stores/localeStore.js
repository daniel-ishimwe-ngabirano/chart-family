import { create } from "zustand";
import en from "../locales/en.json";
import fr from "../locales/fr.json";
import rw from "../locales/rw.json";

const locales = { en, fr, rw };

function getBrowserLocale() {
  try {
    const lang = navigator.language?.split("-")[0];
    if (locales[lang]) return lang;
  } catch {}
  return "en";
}

function getStoredLocale() {
  try {
    return localStorage.getItem("wavechat_locale") || getBrowserLocale();
  } catch {
    return "en";
  }
}

export const useLocaleStore = create((set, get) => ({
  locale: getStoredLocale(),
  translations: locales[getStoredLocale()] || en,

  setLocale: (locale) => {
    if (locales[locale]) {
      try { localStorage.setItem("wavechat_locale", locale); } catch {}
      set({ locale, translations: locales[locale] });
    }
  },

  t: (key, fallback) => {
    const { translations } = get();
    return translations[key] != null ? translations[key] : (fallback ?? key);
  },
}));

export const locales_list = [
  { code: "en", label: "English", native: "English" },
  { code: "fr", label: "French", native: "Français" },
  { code: "rw", label: "Kinyarwanda", native: "Kinyarwanda" },
];
