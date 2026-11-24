/**
 * Типы и правила ТЗ — общие для демо-режима и для настоящих данных с сервера.
 */

import type { DogLook } from "./components/CartoonDog";
import type { ItemId } from "./components/Accessories";

export type Category ="feed" | "walk" | "play" | "health" | "custom";
export type Role = "owner" | "member" | "limited";
export type Mood = "calm" | "happy" | "bored";

export interface Member {
  id: string;
  name: string;
  role: Role;
  color: string;
}

export interface Task {
  id: string;
  dogId: string;
  title: string;
  category: Category;
  /** Время по часовому поясу семьи, «ЧЧ:ММ» */
  time: string;
  assigneeId: string | null;
}

export interface Completion {
  by: string;
  at: number;
}

export interface Dog {
  id: string;
  name: string;
  breed: string | null;
  photoUrl: string | null;
  /** true — есть готовый мультяшный персонаж (пока только у демо-Бони) */
  cartoon?: boolean;
  ageYears?: number | null;
  weightKg?: number | null;
  sex?: "male" | "female" | null;
  notes?: string | null;
  /** Внешность векторного двойника (null — ещё не создан) */
  look?: DogLook | null;
  /** Сколько раз двойник создавался по фото (ТЗ: первая генерация + 2 повтора) */
  lookAttempts?: number;
  equipped?: ItemId | null;
  unlocked?: ItemId[];
}

export const MAX_LOOK_ATTEMPTS = 3;

/** Правила из ТЗ. Позже — в настройках проекта. */
export const RULES = {
  dailyGoal: 3,
  happyMinutes: 30,
  maxPointsPerDay: 5,
  firstItemPoints: 10,
} as const;

export const MOOD_LABEL: Record<Mood, string> = {
  calm: "Спокоен",
  happy: "Радуется",
  bored: "Скучает",
};

export type TaskStatus = "done" | "ahead" | "overdue";

export function dueAt(task: Task, now: Date): number {
  const [h, m] = task.time.split(":").map(Number);
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export function taskStatus(task: Task, done: Completion | undefined, now: Date): TaskStatus {
  if (done) return "done";
  return now.getTime() > dueAt(task, now) ? "overdue" : "ahead";
}

/** Радость 30 минут после выполнения, затем «скучает» при просроченных задачах, иначе «спокоен». */
export function computeMood(tasks: Task[], done: Record<string, Completion>, now: Date): Mood {
  const times = tasks.map((t) => done[t.id]?.at ?? 0);
  const lastDone = Math.max(0, ...times);
  if (lastDone && now.getTime() - lastDone < RULES.happyMinutes * 60_000) return "happy";
  return tasks.some((t) => taskStatus(t, done[t.id], now) === "overdue") ? "bored" : "calm";
}

/* ---------- Даты и серия семьи ---------- */

export function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type WeekState = "done" | "missed" | "today" | "future";

/**
 * Серия и отметки недели по числу выполненных задач семьи за каждый день.
 * (Защита серии и награды за рубежи — на этапе 5.)
 */
export function familyProgress(history: Record<string, number>, today: string, goal: number) {
  const reachedToday = (history[today] ?? 0) >= goal;
  let streak = reachedToday ? 1 : 0;
  for (let d = shiftDate(today, -1); (history[d] ?? 0) >= goal; d = shiftDate(d, -1)) streak++;

  const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // понедельник = 0
  const monday = shiftDate(today, -dow);
  const week: WeekState[] = Array.from({ length: 7 }, (_, i) => {
    const d = shiftDate(monday, i);
    if (d < today) return (history[d] ?? 0) >= goal ? "done" : "missed";
    if (d === today) return reachedToday ? "done" : "today";
    return "future";
  });
  return { streak, week, doneToday: history[today] ?? 0 };
}
