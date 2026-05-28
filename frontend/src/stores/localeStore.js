import { create } from "zustand";
import en from "../locales/en.json";
import fr from "../locales/fr.json";
import rw from "../locales/rw.json";
import { STORAGE_KEYS, DEFAULT_SETTINGS } from "../lib/constants.js";

const locales = { en, fr, rw };

function getBrowserLocale() {
  try {
    const lang = navigator.language?.split("-")[0];
    if (locales[lang]) return lang;
  } catch {}
  return DEFAULT_SETTINGS.LOCALE;
}

function getStoredLocale() {
  try {
    return localStorage.getItem(STORAGE_KEYS.LOCALE) || getBrowserLocale();
  } catch {
    return DEFAULT_SETTINGS.LOCALE;
  }
}

export const useLocaleStore = create((set, get) => ({
  locale: getStoredLocale(),
  translations: locales[getStoredLocale()] || en,

  setLocale: (locale) => {
    if (locales[locale]) {
      try { localStorage.setItem(STORAGE_KEYS.LOCALE, locale); } catch {}
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
