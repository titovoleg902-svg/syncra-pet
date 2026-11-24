import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, liveModeAvailable, type ServerState } from "./api";
import { DEMO_DOG, DEMO_FAMILY, DEMO_POINTS_BEFORE, DEMO_TASKS, demoHistory } from "./demo";
import { isoDate, RULES, type Task } from "./rules";
import { currentUserName, haptic } from "./telegram";
import { useTheme } from "./theme";
import { useDemoDone, useNow } from "./useToday";
import { AddDogScreen } from "./screens/AddDogScreen";
import { TodayScreen } from "./screens/TodayScreen";

type Theme = ReturnType<typeof useTheme>;
type Toast = (text: string) => void;

export default function App() {
  const theme = useTheme();
  const { toast, show } = useToast();
  return (
    <div className="app">
      {liveModeAvailable() ? <LiveApp theme={theme} toast={show} /> : <DemoApp theme={theme} toast={show} />}
      {toast && (
        <div className="toast" role="status" key={toast.id}>
          {toast.text}
        </div>
      )}
    </div>
  );
}

/* ---------------- Живой режим: данные семьи с сервера ---------------- */

const SELECTED_KEY = "syncra:selected-dog";

function LiveApp({ theme, toast }: { theme: Theme; toast: Toast }) {
  const [state, setState] = useState<ServerState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(() => safeGet(SELECTED_KEY));
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [joyKey, setJoyKey] = useState(0);
  const [now] = useNow();

  const load = useCallback(() => {
    setLoadError(null);
    api
      .session()
      .then(setState)
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : "Не удалось загрузить данные"));
  }, []);

  useEffect(load, [load]);

  // Вернулись в приложение — подтягиваем отметки других членов семьи.
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && api.session().then(setState).catch(() => {});
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const selectDog = (id: string) => {
    setSelectedId(id);
    safeSet(SELECTED_KEY, id);
  };

  if (!state) {
    return loadError ? (
      <div className="center-screen">
        <p>{loadError}</p>
        <button type="button" className="btn-primary" onClick={load}>
          Повторить
        </button>
      </div>
    ) : (
      <div className="center-screen">
        <span className="spinner" aria-label="Загрузка" />
      </div>
    );
  }

  if (!state.dogs.length || adding) {
    return (
      <AddDogScreen
        firstDog={!state.dogs.length}
        onCancel={state.dogs.length ? () => setAdding(false) : undefined}
        onCreated={(s) => {
          setState(s);
          setAdding(false);
          if (s.createdDogId) selectDog(s.createdDogId);
          window.scrollTo({ top: 0 });
          toast("Собака добавлена! 🐾");
        }}
      />
    );
  }

  const dog = state.dogs.find((d) => d.id === selectedId) ?? state.dogs[0];
  const today = state.today ?? isoDate(now);
  const familyDoneToday = Object.keys(state.done).length;

  const toggle = async (task: Task) => {
    const wasDone = Boolean(state.done[task.id]);
    const prev = state.done[task.id];
    // Сразу показываем отметку, а сервер подтверждает её в фоне.
    setState((s) => {
      if (!s) return s;
      const done = { ...s.done };
      if (wasDone) delete done[task.id];
      else done[task.id] = { by: s.me?.name ?? currentUserName(), at: Date.now() };
      return { ...s, done };
    });
    setPending((p) => new Set(p).add(task.id));
    if (!wasDone) {
      haptic.success();
      setJoyKey((k) => k + 1);
    } else haptic.tap();
    try {
      const next = await (wasDone ? api.undo(task.id) : api.complete(task.id));
      setState(next);
      if (wasDone) toast(`Отметка снята: «${task.title}» снова в работе`);
      else toast(Object.keys(next.done).length === (next.family?.dailyGoal ?? RULES.dailyGoal) ? "Цель дня выполнена! 🎉" : `Готово: ${task.title.toLowerCase()}`);
    } catch (e) {
      setState((s) => {
        if (!s) return s;
        const done = { ...s.done };
        if (prev) done[task.id] = prev;
        else delete done[task.id];
        return { ...s, done };
      });
      toast(e instanceof ApiError ? e.message : "Не сохранено — попробуйте ещё раз");
    } finally {
      setPending((p) => {
        const n = new Set(p);
        n.delete(task.id);
        return n;
      });
    }
  };

  return (
    <TodayScreen
      dog={dog}
      dogs={state.dogs}
      members={state.members}
      tasks={state.tasks.filter((t) => t.dogId === dog.id)}
      done={state.done}
      pending={pending}
      now={now}
      today={today}
      history={{ ...state.history, [today]: familyDoneToday }}
      goal={state.family?.dailyGoal ?? RULES.dailyGoal}
      points={state.points[dog.id] ?? 0}
      joyKey={joyKey}
      onToggle={toggle}
      onSelectDog={selectDog}
      onAddDog={() => {
        setAdding(true);
        window.scrollTo({ top: 0 });
      }}
      toast={toast}
      theme={theme}
    />
  );
}

/* ---------------- Демо-режим: Боня, всё хранится на устройстве ---------------- */

function DemoApp({ theme, toast }: { theme: Theme; toast: Toast }) {
  const [now] = useNow();
  const { done, complete, undo } = useDemoDone(now);
  const [joyKey, setJoyKey] = useState(0);
  const today = isoDate(now);
  const doneCount = DEMO_TASKS.filter((t) => done[t.id]).length;
  const points = DEMO_POINTS_BEFORE + Math.min(doneCount, RULES.maxPointsPerDay);

  const toggle = (task: Task) => {
    if (done[task.id]) {
      undo(task.id);
      haptic.tap();
      toast(`Отметка снята: «${task.title}» снова в работе`);
      return;
    }
    complete(task.id, currentUserName());
    haptic.success();
    setJoyKey((k) => k + 1);
    const nextPoints = DEMO_POINTS_BEFORE + Math.min(doneCount + 1, RULES.maxPointsPerDay);
    if (points < RULES.firstItemPoints && nextPoints >= RULES.firstItemPoints) toast("🎁 Новая вещь для Бони: панама!");
    else if (doneCount + 1 === RULES.dailyGoal) toast("Цель дня выполнена! 🎉");
    else toast(`Готово: ${task.title.toLowerCase()} · Боня рада!`);
  };

  return (
    <TodayScreen
      dog={DEMO_DOG}
      dogs={[DEMO_DOG]}
      members={DEMO_FAMILY}
      tasks={DEMO_TASKS}
      done={done}
      now={now}
      today={today}
      history={demoHistory(today, doneCount)}
      goal={RULES.dailyGoal}
      points={points}
      joyKey={joyKey}
      onToggle={toggle}
      onSelectDog={() => {}}
      onAddDog={() => toast("Чтобы добавить свою собаку, откройте приложение из бота в Telegram")}
      toast={toast}
      theme={theme}
      demo
    />
  );
}

/* ---------------- Мелочи ---------------- */

function useToast() {
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const show = useCallback((text: string) => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), text });
    timer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);
  return { toast, show };
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* не страшно */
  }
}

