import { useEffect, useState } from "react";
import { getWebApp, paintTelegramChrome } from "./telegram";

/** Режим темы по ТЗ: «Как в Telegram / Светлая / Тёмная». */
export type ThemeMode = "telegram" | "light" | "dark";
type Scheme = "light" | "dark";

const STORAGE_KEY = "syncra:theme";
// Цвета фона из ТЗ — ими же красим шапку Telegram.
const BG: Record<Scheme, string> = { light: "#F7F4EF", dark: "#18171E" };

function loadMode(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "telegram") return v;
  } catch {
    /* хранилище недоступно — берём тему Telegram */
  }
  return "telegram";
}

function systemScheme(): Scheme {
  const wa = getWebApp();
  if (wa) return wa.colorScheme;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Хранит выбранный режим и вычисляет итоговую схему.
 * В режиме «Как в Telegram» реагирует на смену темы Telegram без перезапуска.
 * Пока выбор хранится на устройстве; позже — на сервере для пользователя (ТЗ).
 */
export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(loadMode);
  const [telegramScheme, setTelegramScheme] = useState<Scheme>(systemScheme);

  useEffect(() => {
    const update = () => setTelegramScheme(systemScheme());
    const wa = getWebApp();
    wa?.onEvent("themeChanged", update);
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    mq?.addEventListener?.("change", update);
    return () => {
      wa?.offEvent("themeChanged", update);
      mq?.removeEventListener?.("change", update);
    };
  }, []);

  const scheme: Scheme = mode === "telegram" ? telegramScheme : mode;

  useEffect(() => {
    document.documentElement.dataset.theme = scheme;
    paintTelegramChrome(BG[scheme]);
  }, [scheme]);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* не сохранилось — не страшно */
    }
  };

  return { mode, scheme, setMode };
}
