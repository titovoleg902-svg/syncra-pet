/**
 * Демо-данные: показываются, когда приложение открыто не из Telegram
 * (например, в браузере) или сервер ещё не подключён.
 */
import { RULES, shiftDate, type Dog, type Member, type Task } from "./rules";

export const DEMO_DOG: Dog = { id: "boni", name: "Боня", breed: "Метис", photoUrl: null, cartoon: true };

export const DEMO_FAMILY: Member[] = [
  { id: "anna", name: "Анна", role: "owner", color: "#E99380" },
  { id: "ilya", name: "Илья", role: "member", color: "#9C8BD0" },
  { id: "oleg", name: "Олег", role: "member", color: "#7FAE8A" },
];

export const DEMO_TASKS: Task[] = [
  { id: "feed-morning", dogId: "boni", title: "Покормить", category: "feed", time: "08:00", assigneeId: "anna" },
  { id: "walk-day", dogId: "boni", title: "Прогулка", category: "walk", time: "14:00", assigneeId: "ilya" },
  { id: "play-evening", dogId: "boni", title: "Поиграть", category: "play", time: "19:00", assigneeId: "oleg" },
  { id: "walk-night", dogId: "boni", title: "Вечерняя прогулка", category: "walk", time: "21:30", assigneeId: "anna" },
];

/** История: шесть прошлых дней с закрытой целью. */
export function demoHistory(today: string, doneToday: number): Record<string, number> {
  const h: Record<string, number> = { [today]: doneToday };
  for (let i = 1; i <= 6; i++) h[shiftDate(today, -i)] = RULES.dailyGoal;
  return h;
}

export const DEMO_POINTS_BEFORE = 7;
