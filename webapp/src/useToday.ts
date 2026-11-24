import { useEffect, useState } from "react";
import { type Completion, todayKey } from "./demo";

type DoneMap = Record<string, Completion>;
const PREFIX = "syncra:demo:done:";

function load(key: string, now: Date): DoneMap {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw) return JSON.parse(raw) as DoneMap;
  } catch {
    /* нет доступа к хранилищу — начинаем с чистого дня */
  }
  // Демо: если утро уже прошло, утреннее кормление «уже отметила Анна».
  const seeded = new Date(now);
  seeded.setHours(8, 5, 0, 0);
  return now > seeded ? { "feed-morning": { by: "Анна", at: seeded.getTime() } } : {};
}

function save(key: string, done: DoneMap) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(done));
  } catch {
    /* не сохранилось — работаем в памяти */
  }
}

/**
 * Состояние экрана «Сегодня»: текущее время (обновляется раз в 30 секунд,
 * чтобы статусы «Впереди → Просрочено» и настроение менялись сами)
 * и отметки выполнения за сегодняшний день.
 */
export function useToday() {
  const [now, setNow] = useState(() => new Date());
  const key = todayKey(now);
  const [state, setState] = useState(() => ({ key, done: load(key, now) }));

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Наступил новый день — начинаем новый список отметок.
  const done = state.key === key ? state.done : load(key, now);
  if (state.key !== key) setState({ key, done });

  const update = (next: DoneMap) => {
    setState({ key, done: next });
    save(key, next);
  };

  /** Отметить выполнение. Повторная отметка ничего не дублирует. */
  const complete = (taskId: string, by: string) => {
    if (done[taskId]) return;
    const at = Date.now();
    setNow(new Date(at));
    update({ ...done, [taskId]: { by, at } });
  };

  /** Отмена ошибочной отметки: задача возвращается в работу, награда отменяется. */
  const undo = (taskId: string) => {
    const next = { ...done };
    delete next[taskId];
    update(next);
  };

  return { now, done, complete, undo };
}
