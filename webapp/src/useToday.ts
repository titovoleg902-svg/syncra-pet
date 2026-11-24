import { useEffect, useState } from "react";
import { isoDate, type Completion } from "./rules";

/** Текущее время, обновляется раз в 30 секунд — статусы и настроение меняются сами. */
export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return [now, setNow] as const;
}

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

/** Демо-режим: отметки хранятся только на этом устройстве. */
export function useDemoDone(now: Date) {
  const key = isoDate(now);
  const [state, setState] = useState(() => ({ key, done: load(key, now) }));
  const done = state.key === key ? state.done : load(key, now);
  if (state.key !== key) setState({ key, done });

  const update = (next: DoneMap) => {
    setState({ key, done: next });
    save(key, next);
  };
  const complete = (taskId: string, by: string) => {
    if (!done[taskId]) update({ ...done, [taskId]: { by, at: Date.now() } });
  };
  const undo = (taskId: string) => {
    const next = { ...done };
    delete next[taskId];
    update(next);
  };
  return { done, complete, undo };
}
