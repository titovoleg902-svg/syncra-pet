import { useState } from "react";
import { computeMood, familyProgress, type Completion, type Dog, type Member, type Task } from "../rules";
import type { ThemeMode } from "../theme";
import { haptic } from "../telegram";
import { Icon } from "../components/Icon";
import { Avatar } from "../components/Avatar";
import { PetStage, MOOD_IMAGES } from "../components/PetStage";
import { StreakCard } from "../components/StreakCard";
import { TaskList } from "../components/TaskList";
import { CartoonDog } from "../components/CartoonDog";
import { ItemIcon } from "../components/Accessories";

const SOON = "появится на следующем этапе";

export interface TodayProps {
  dog: Dog;
  dogs: Dog[];
  members: Member[];
  /** Задачи выбранной собаки */
  tasks: Task[];
  /** Сегодняшние отметки (по всем задачам семьи) */
  done: Record<string, Completion>;
  pending?: Set<string>;
  now: Date;
  today: string;
  /** Сколько задач семья закрыла по дням (включая сегодня) */
  history: Record<string, number>;
  goal: number;
  points: number;
  joyKey: number;
  onToggle: (task: Task) => void;
  onSelectDog: (id: string) => void;
  onAddDog: () => void;
  onCreateCharacter?: () => void;
  onOpenPet: () => void;
  toast: (text: string) => void;
  theme: { mode: ThemeMode; setMode: (m: ThemeMode) => void };
  demo?: boolean;
}

export function TodayScreen(p: TodayProps) {
  const [sheet, setSheet] = useState<"settings" | "dogs" | null>(null);
  const mood = computeMood(p.tasks, p.done, p.now);
  const { streak, week, doneToday } = familyProgress(p.history, p.today, p.goal);
  const dateLabel = p.now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <header className="topbar">
        <button type="button" className="dog-pill" onClick={() => setSheet("dogs")}>
          <DogThumb dog={p.dog} />
          {p.dog.name}
          <Icon name="chevronDown" size={16} />
        </button>
        <button type="button" className="family-stack" onClick={() => setSheet("settings")} aria-label="Семья и настройки">
          {p.members.slice(0, 4).map((m) => (
            <Avatar key={m.id} member={m} size={34} />
          ))}
        </button>
      </header>

      <main className="content">
        <div className="hero-title">
          <h1>Сегодня</h1>
          <p className="muted">{dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</p>
        </div>

        <PetStage dog={p.dog} mood={mood} joyKey={p.joyKey} onCreateCharacter={p.onCreateCharacter} />
        <p className="stage-caption">Настроение персонажа — реакция на отметки семьи</p>

        <StreakCard streak={streak} doneCount={doneToday} goal={p.goal} week={week} onOpen={() => p.toast(`Экран «Регулярность» ${SOON}`)} />

        <h2 className="section-title">Задачи на сегодня</h2>
        <TaskList tasks={p.tasks} members={p.members} done={p.done} pending={p.pending ?? new Set()} now={p.now} onToggle={p.onToggle} />

        <button type="button" className="btn-primary" onClick={() => p.toast(`Добавление задач ${SOON}`)}>
          <Icon name="plus" size={20} /> Добавить задачу
        </button>

        <button type="button" className="card style-link" onClick={p.onOpenPet}>
          <span className="style-link__art">{p.dog.equipped ? <ItemIcon id={p.dog.equipped} /> : <Icon name="gift" size={26} />}</span>
          <span className="style-link__text">
            <b>Стиль питомца</b>
            <span className="muted small">Вещи, эмоции и награды</span>
          </span>
          <Icon name="chevronRight" size={18} />
        </button>
      </main>

      {sheet === "settings" && <SettingsSheet members={p.members} theme={p.theme} onClose={() => setSheet(null)} />}
      {sheet === "dogs" && (
        <Sheet title="Мои собаки" onClose={() => setSheet(null)}>
          <ul className="members">
            {p.dogs.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  className="members__row members__row--btn"
                  onClick={() => {
                    haptic.select();
                    p.onSelectDog(d.id);
                    setSheet(null);
                  }}
                >
                  <DogThumb dog={d} size={40} />
                  <span className="members__name">{d.name}</span>
                  <span className="members__role">{d.breed}</span>
                  {d.id === p.dog.id && <Icon name="check" size={18} />}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setSheet(null);
              p.onAddDog();
            }}
          >
            <Icon name="plus" size={20} /> Добавить собаку
          </button>
          {p.demo && <p className="muted small sheet__note">Это демо-режим. Чтобы добавить свою собаку, откройте приложение из бота в Telegram.</p>}
        </Sheet>
      )}
    </>
  );
}

function DogThumb({ dog, size = 34 }: { dog: Dog; size?: number }) {
  if (dog.look) {
    return (
      <span className="dog-thumb dog-thumb--svg" style={{ width: size, height: size }}>
        <CartoonDog look={dog.look} mood="calm" animated={false} />
      </span>
    );
  }
  const src = dog.cartoon ? MOOD_IMAGES.calm : dog.photoUrl;
  return src ? (
    <img src={src} alt="" className="dog-thumb" style={{ width: size, height: size }} />
  ) : (
    <span className="dog-thumb dog-thumb--empty" style={{ width: size, height: size }}>
      <Icon name="paw" size={size * 0.55} />
    </span>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet__handle" />
        <div className="sheet__head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Закрыть">
            <Icon name="x" size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const MODES: { id: ThemeMode; label: string }[] = [
  { id: "telegram", label: "Как в Telegram" },
  { id: "light", label: "Светлая" },
  { id: "dark", label: "Тёмная" },
];

const ROLE_LABEL = { owner: "Владелец", member: "Участник", limited: "Ограниченный" } as const;

function SettingsSheet({ members, theme, onClose }: { members: Member[]; theme: TodayProps["theme"]; onClose: () => void }) {
  return (
    <Sheet title="Семья и настройки" onClose={onClose}>
      <h3 className="sheet__label">Тема</h3>
      <div className="segmented" role="radiogroup" aria-label="Тема">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={theme.mode === m.id}
            className="segmented__item"
            onClick={() => {
              haptic.select();
              theme.setMode(m.id);
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <h3 className="sheet__label">Семья</h3>
      <ul className="members">
        {members.map((m) => (
          <li key={m.id} className="members__row">
            <Avatar member={m} size={36} />
            <span className="members__name">{m.name}</span>
            <span className="members__role">{ROLE_LABEL[m.role]}</span>
          </li>
        ))}
      </ul>
      <p className="muted small">Приглашения, роли и уведомления — на следующих этапах.</p>
    </Sheet>
  );
}
