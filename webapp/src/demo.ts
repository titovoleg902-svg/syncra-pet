/**
 * Демонстрационные данные этапа 1. На следующих этапах их заменит сервер
 * (общая база семьи), а здесь останутся только типы и правила.
 */

export type Category = "feed" | "walk" | "play" | "health" | "custom";
export type Role = "owner" | "member" | "limited";
export type Mood = "calm" | "happy" | "bored";

export interface Member {
  id: string;
  name: string;
  role: Role;
  /** Цвет кружка-аватарки */
  color: string;
}

export interface Task {
  id: string;
  title: string;
  category: Category;
  /** Время по часовому поясу семьи, «ЧЧ:ММ» */
  time: string;
  assigneeId: string;
}

export interface Completion {
  /** Кто реально отметил (имя из Telegram) */
  by: string;
  /** Когда отметил, миллисекунды */
  at: number;
}

/** Правила из ТЗ. Позже — в настройках проекта. */
export const RULES = {
  dailyGoal: 3, // цель дня: задач на всю семью
  happyMinutes: 30, // сколько персонаж радуется после выполнения
  pointsPerTask: 1,
  maxPointsPerDay: 5, // очков в день на собаку
  firstItemPoints: 10, // первый предмет
} as const;

export const DOG = {
  id: "boni",
  name: "Боня",
  breed: "Метис",
  coat: "Серо-белая",
};

export const FAMILY: Member[] = [
  { id: "anna", name: "Анна", role: "owner", color: "#E99380" },
  { id: "ilya", name: "Илья", role: "member", color: "#9C8BD0" },
  { id: "oleg", name: "Олег", role: "member", color: "#7FAE8A" },
];

export const TASKS: Task[] = [
  { id: "feed-morning", title: "Покормить", category: "feed", time: "08:00", assigneeId: "anna" },
  { id: "walk-day", title: "Прогулка", category: "walk", time: "14:00", assigneeId: "ilya" },
  { id: "play-evening", title: "Поиграть", category: "play", time: "19:00", assigneeId: "oleg" },
  { id: "walk-night", title: "Вечерняя прогулка", category: "walk", time: "21:30", assigneeId: "anna" },
];

/** Что было до сегодняшнего дня (демо): серия семьи и накопленные очки. */
export const DEMO_HISTORY = {
  streakBefore: 6,
  pointsBefore: 7,
};

export interface Item {
  id: string;
  name: string;
  emoji: string;
  /** Условие получения — показываем на закрытом предмете */
  condition: string;
  /** Открывается при наборе очков (иначе — другим условием, пока закрыт) */
  unlockAtPoints?: number;
}

/** Стартовый набор: 3 аксессуара (ТЗ). */
export const ITEMS: Item[] = [
  { id: "panama", name: "Панама", emoji: "👒", condition: "За 10 очков", unlockAtPoints: RULES.firstItemPoints },
  { id: "bandana", name: "Бандана", emoji: "🧣", condition: "7 дней серии" },
  { id: "party-hat", name: "Колпак", emoji: "🥳", condition: "Пригласить близкого" },
];

export const MOOD_LABEL: Record<Mood, string> = {
  calm: "Спокоен",
  happy: "Радуется",
  bored: "Скучает",
};

/* ---------- Чистые функции-правила ---------- */

/** Срок задачи сегодня как отметка времени. */
export function dueAt(task: Task, now: Date): number {
  const [h, m] = task.time.split(":").map(Number);
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export type TaskStatus = "done" | "ahead" | "overdue";

export function taskStatus(task: Task, done: Completion | undefined, now: Date): TaskStatus {
  if (done) return "done";
  return now.getTime() > dueAt(task, now) ? "overdue" : "ahead";
}

/**
 * Настроение по ТЗ: радость 30 минут после выполнения,
 * затем «скучает», если остались просроченные задачи, иначе «спокоен».
 */
export function computeMood(tasks: Task[], done: Record<string, Completion>, now: Date): Mood {
  const lastDone = Math.max(0, ...Object.values(done).map((c) => c.at));
  if (lastDone && now.getTime() - lastDone < RULES.happyMinutes * 60_000) return "happy";
  const hasOverdue = tasks.some((t) => taskStatus(t, done[t.id], now) === "overdue");
  return hasOverdue ? "bored" : "calm";
}

export function todayKey(now: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}
