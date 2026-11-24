import { Icon, type IconName } from "./Icon";

export type TabId = "today" | "tasks" | "pet" | "map";

const NAV: { id: TabId; label: string; icon: IconName; ready: boolean }[] = [
  { id: "today", label: "Сегодня", icon: "calendar", ready: true },
  { id: "tasks", label: "Задачи", icon: "tasks", ready: false },
  { id: "pet", label: "Питомец", icon: "paw", ready: true },
  { id: "map", label: "Карта", icon: "mapPin", ready: false },
];

export function BottomNav({ tab, onTab, onSoon }: { tab: TabId; onTab: (t: TabId) => void; onSoon: (label: string) => void }) {
  return (
    <nav className="nav" aria-label="Разделы">
      {NAV.map((n) => (
        <button
          key={n.id}
          type="button"
          className={`nav__item ${tab === n.id ? "is-active" : ""}`}
          aria-current={tab === n.id ? "page" : undefined}
          onClick={() => {
            if (!n.ready) return onSoon(n.label);
            if (n.id === tab) window.scrollTo({ top: 0, behavior: "smooth" });
            else {
              onTab(n.id);
              window.scrollTo({ top: 0 });
            }
          }}
        >
          <span className="nav__icon">
            <Icon name={n.icon} size={22} />
          </span>
          {n.label}
        </button>
      ))}
    </nav>
  );
}
