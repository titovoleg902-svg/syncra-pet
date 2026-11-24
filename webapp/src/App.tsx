import { useEffect, useRef, useState } from "react";
import { computeMood, DEMO_HISTORY, DOG, FAMILY, RULES, TASKS, type Task } from "./demo";
import { useToday } from "./useToday";
import { useTheme, type ThemeMode } from "./theme";
import { currentUserName, haptic } from "./telegram";
import { Icon, type IconName } from "./components/Icon";
import { Avatar } from "./components/Avatar";
import { PetStage, MOOD_IMAGES } from "./components/PetStage";
import { StreakCard } from "./components/StreakCard";
import { TaskList } from "./components/TaskList";
import { StyleCard } from "./components/StyleCard";

const SOON = "Появится на следующем этапе";

export default function App() {
  const theme = useTheme();
  const { now, done, complete, undo } = useToday();
  const [joyKey, setJoyKey] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { toast, show } = useToast();

  const doneCount = TASKS.filter((t) => done[t.id]).length;
  const mood = computeMood(TASKS, done, now);
  const streak = DEMO_HISTORY.streakBefore + (doneCount >= RULES.dailyGoal ? 1 : 0);
  const points = DEMO_HISTORY.pointsBefore + Math.min(doneCount, RULES.maxPointsPerDay) * RULES.pointsPerTask;

  const toggle = (task: Task) => {
    if (done[task.id]) {
      undo(task.id);
      haptic.tap();
      show(`Отметка снята: «${task.title}» снова в работе`);
      return;
    }
    complete(task.id, currentUserName());
    haptic.success();
    setJoyKey((k) => k + 1);
    const nextDone = doneCount + 1;
    const nextPoints = DEMO_HISTORY.pointsBefore + Math.min(nextDone, RULES.maxPointsPerDay);
    if (points < RULES.firstItemPoints && nextPoints >= RULES.firstItemPoints) show("🎁 Новая вещь для Бони: панама!");
    else if (nextDone === RULES.dailyGoal) show(`Цель дня выполнена! Серия семьи: ${streak + 1} дней`);
    else show(`Готово: ${task.title.toLowerCase()} · ${DOG.name} рада!`);
  };

  const dateLabel = now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="dog-pill" onClick={() => show("Вторая собака — на следующем этапе")}>
          <img src={MOOD_IMAGES.calm} alt="" className="dog-pill__img" />
          {DOG.name}
          <Icon name="chevronDown" size={16} />
        </button>
        <button type="button" className="family-stack" onClick={() => setSheetOpen(true)} aria-label="Семья и настройки">
          {FAMILY.map((m) => (
            <Avatar key={m.id} member={m} size={34} />
          ))}
        </button>
      </header>

      <main className="content">
        <div className="hero-title">
          <h1>Сегодня</h1>
          <p className="muted">{capitalize(dateLabel)}</p>
        </div>

        <PetStage mood={mood} name={DOG.name} joyKey={joyKey} />
        <p className="stage-caption">Настроение персонажа — реакция на отметки семьи</p>

        <StreakCard streak={streak} doneCount={doneCount} now={now} onOpen={() => show(`«Регулярность»: ${SOON.toLowerCase()}`)} />

        <h2 className="section-title">Задачи на сегодня</h2>
        <TaskList tasks={TASKS} done={done} now={now} onToggle={toggle} />

        <button type="button" className="btn-primary" onClick={() => show(`Добавление задач: ${SOON.toLowerCase()}`)}>
          <Icon name="plus" size={20} /> Добавить задачу
        </button>

        <h2 className="section-title">Стиль {DOG.name === "Боня" ? "Бони" : DOG.name}</h2>
        <StyleCard dogName={DOG.name} points={points} mood={mood} onToast={show} />
      </main>

      <BottomNav onSoon={(label) => show(`«${label}»: ${SOON.toLowerCase()}`)} />

      {toast && (
        <div className="toast" role="status" key={toast.id}>
          {toast.text}
        </div>
      )}

      {sheetOpen && <SettingsSheet mode={theme.mode} onMode={theme.setMode} onClose={() => setSheetOpen(false)} />}
    </div>
  );
}

const NAV: { label: string; icon: IconName }[] = [
  { label: "Сегодня", icon: "calendar" },
  { label: "Задачи", icon: "tasks" },
  { label: "Питомец", icon: "paw" },
  { label: "Карта", icon: "mapPin" },
];

function BottomNav({ onSoon }: { onSoon: (label: string) => void }) {
  return (
    <nav className="nav" aria-label="Разделы">
      {NAV.map((n, i) => (
        <button
          key={n.label}
          type="button"
          className={`nav__item ${i === 0 ? "is-active" : ""}`}
          aria-current={i === 0 ? "page" : undefined}
          onClick={() => (i === 0 ? window.scrollTo({ top: 0, behavior: "smooth" }) : onSoon(n.label))}
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

const MODES: { id: ThemeMode; label: string }[] = [
  { id: "telegram", label: "Как в Telegram" },
  { id: "light", label: "Светлая" },
  { id: "dark", label: "Тёмная" },
];

const ROLE_LABEL = { owner: "Владелец", member: "Участник", limited: "Ограниченный" } as const;

function SettingsSheet({ mode, onMode, onClose }: { mode: ThemeMode; onMode: (m: ThemeMode) => void; onClose: () => void }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Семья и настройки" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__handle" />
        <div className="sheet__head">
          <h2>Семья и настройки</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Закрыть">
            <Icon name="x" size={20} />
          </button>
        </div>

        <h3 className="sheet__label">Тема</h3>
        <div className="segmented" role="radiogroup" aria-label="Тема">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode === m.id}
              className="segmented__item"
              onClick={() => {
                haptic.select();
                onMode(m.id);
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <h3 className="sheet__label">Семья</h3>
        <ul className="members">
          {FAMILY.map((m) => (
            <li key={m.id} className="members__row">
              <Avatar member={m} size={36} />
              <span className="members__name">{m.name}</span>
              <span className="members__role">{ROLE_LABEL[m.role]}</span>
            </li>
          ))}
        </ul>
        <p className="muted small">Приглашения, роли и уведомления — на следующих этапах.</p>
      </div>
    </div>
  );
}

function useToast() {
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const show = (text: string) => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), text });
    timer.current = window.setTimeout(() => setToast(null), 2600);
  };
  return { toast, show };
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
