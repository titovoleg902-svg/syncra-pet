/**
 * Тонкая обёртка над window.Telegram.WebApp.
 * Скрипт telegram-web-app.js подключён в index.html.
 * В обычном браузере (без Telegram) все функции безопасно ничего не делают,
 * поэтому приложение можно открывать и на компьютере для проверки.
 */

type HapticStyle = "light" | "medium" | "heavy" | "rigid" | "soft";

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: { user?: { id: number; first_name: string; last_name?: string } };
  version: string;
  platform: string;
  colorScheme: "light" | "dark";
  ready(): void;
  expand(): void;
  isVersionAtLeast(version: string): boolean;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  setBottomBarColor?(color: string): void;
  disableVerticalSwipes?(): void;
  onEvent(event: string, cb: () => void): void;
  offEvent(event: string, cb: () => void): void;
  HapticFeedback?: {
    impactOccurred(style: HapticStyle): void;
    notificationOccurred(type: "error" | "success" | "warning"): void;
    selectionChanged(): void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

/** WebApp, только если страница реально открыта внутри Telegram. */
export function getWebApp(): TelegramWebApp | undefined {
  const wa = window.Telegram?.WebApp;
  return wa && wa.platform !== "unknown" ? wa : undefined;
}

export function initTelegram() {
  const wa = getWebApp();
  if (!wa) return;
  wa.ready();
  wa.expand();
  // Чтобы свайп вниз при прокрутке списка не закрывал приложение.
  if (wa.isVersionAtLeast("7.7")) wa.disableVerticalSwipes?.();
}

/** Имя текущего пользователя Telegram (для отметки «кто выполнил»). */
export function currentUserName(): string {
  return getWebApp()?.initDataUnsafe.user?.first_name ?? "Вы";
}

export const haptic = {
  success: () => getWebApp()?.HapticFeedback?.notificationOccurred("success"),
  tap: () => getWebApp()?.HapticFeedback?.impactOccurred("light"),
  select: () => getWebApp()?.HapticFeedback?.selectionChanged(),
};

/** Красим шапку и фон Telegram в цвет приложения, чтобы не было «шва». */
export function paintTelegramChrome(bg: string) {
  const wa = getWebApp();
  if (!wa || !wa.isVersionAtLeast("6.1")) return;
  try {
    wa.setHeaderColor(bg);
    wa.setBackgroundColor(bg);
    if (wa.isVersionAtLeast("7.10")) wa.setBottomBarColor?.(bg);
  } catch {
    /* старые клиенты Telegram — не критично */
  }
}
