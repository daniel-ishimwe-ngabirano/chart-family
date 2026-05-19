import { useLocaleStore } from "../stores/localeStore.js";

export function useTranslate() {
  const t = useLocaleStore((s) => s.t);
  return t;
}
