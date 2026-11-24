import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, liveModeAvailable, type ServerState } from "./api";
import { DEMO_DOG, DEMO_FAMILY, DEMO_POINTS_BEFORE, DEMO_TASKS, demoHistory } from "./demo";
import { computeMood, isoDate, RULES, type Dog, type Task } from "./rules";
import { confirmDialog, currentUserName, haptic } from "./telegram";
import { useTheme } from "./theme";
import { useDemoDone, useNow } from "./useToday";
import { BottomNav, type TabId } from "./components/BottomNav";
import { ITEMS, type ItemId } from "./components/Accessories";
import type { DogLook } from "./components/CartoonDog";
import { AddDogScreen } from "./screens/AddDogScreen";
import { GenerateScreen } from "./screens/GenerateScreen";
import { LookEditor } from "./screens/LookEditor";
import { PetScreen } from "./screens/PetScreen";
import { TodayScreen } from "./screens/TodayScreen";

type Theme = ReturnType<typeof useTheme>;
type Toast = (text: string) => void;
const SOON = (label: string) => `Раздел «${label}» появится на следующем этапе`;

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

type View =
  | { kind: "tabs" }
  | { kind: "add" }
  | { kind: "generate"; dogId: string }
  | { kind: "edit"; dogId: string; initial: DogLook; generated: boolean };

function LiveApp({ theme, toast }: { theme: Theme; toast: Toast }) {
  const [state, setState] = useState<ServerState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: "tabs" });
  const [tab, setTab] = useState<TabId>("today");
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

  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && api.session().then(setState).catch(() => {});
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const selectDog = (id: string) => {
    setSelectedId(id);
    safeSet(SELECTED_KEY, id);
  };

  const go = (v: View) => {
    setView(v);
    window.scrollTo({ top: 0 });
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

  if (!state.dogs.length || view.kind === "add") {
    return (
      <AddDogScreen
        firstDog={!state.dogs.length}
        onCancel={state.dogs.length ? () => go({ kind: "tabs" }) : undefined}
        onCreated={(s) => {
          setState(s);
          if (s.createdDogId) {
            selectDog(s.createdDogId);
            go({ kind: "generate", dogId: s.createdDogId }); // ТЗ: после добавления — создание персонажа
          } else go({ kind: "tabs" });
        }}
      />
    );
  }

  const saveLook = async (dogId: string, look: DogLook, generated: boolean) => {
    try {
      setState(await api.saveLook(dogId, look, generated));
      haptic.success();
      toast("Двойник сохранён! Теперь можно наряжать 🐾");
      setTab("pet");
      go({ kind: "tabs" });
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Не сохранено — попробуйте ещё раз");
    }
  };

  if (view.kind === "generate" || view.kind === "edit") {
    const target = state.dogs.find((d) => d.id === view.dogId);
    if (target && view.kind === "generate") {
      return (
        <GenerateScreen
          dog={target}
          onSave={(look) => saveLook(target.id, look, true)}
          onEdit={(look) => go({ kind: "edit", dogId: target.id, initial: look, generated: true })}
          onSkip={() => {
            setTab("today");
            go({ kind: "tabs" });
            toast("Персонажа можно создать позже — во вкладке «Питомец»");
          }}
        />
      );
    }
    if (target && view.kind === "edit") {
      return <LookEditor name={target.name} initial={view.initial} onSave={(look) => saveLook(target.id, look, view.generated)} onCancel={() => go({ kind: "tabs" })} />;
    }
  }

  const dog = state.dogs.find((d) => d.id === selectedId) ?? state.dogs[0];
  const today = state.today ?? isoDate(now);
  const dogTasks = state.tasks.filter((t) => t.dogId === dog.id);
  const mood = computeMood(dogTasks, state.done, now);

  const toggle = async (task: Task) => {
    const wasDone = Boolean(state.done[task.id]);
    const prev = state.done[task.id];
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

  const equip = async (item: ItemId | null) => {
    const before = dog.equipped ?? null;
    const patch = (eq: ItemId | null) => setState((s) => (s ? { ...s, dogs: s.dogs.map((d) => (d.id === dog.id ? { ...d, equipped: eq } : d)) } : s));
    patch(item); // вещь появляется сразу (ТЗ), сервер сохраняет в фоне
    try {
      setState(await api.equip(dog.id, item));
    } catch (e) {
      patch(before);
      toast(e instanceof ApiError ? e.message : "Не сохранено — попробуйте ещё раз");
    }
  };

  const deleteDog = async () => {
    if (!(await confirmDialog(`Удалить ${dog.name}? Задачи, отметки и фото удалятся без возможности восстановления.`))) return;
    try {
      const next = await api.deleteDog(dog.id);
      setState(next);
      setTab("today");
      toast(`${dog.name} удалён(а)`);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Не получилось удалить");
    }
  };

  return (
    <>
      {tab === "today" ? (
        <TodayScreen
          dog={dog}
          dogs={state.dogs}
          members={state.members}
          tasks={dogTasks}
          done={state.done}
          pending={pending}
          now={now}
          today={today}
          history={{ ...state.history, [today]: Object.keys(state.done).length }}
          goal={state.family?.dailyGoal ?? RULES.dailyGoal}
          points={state.points[dog.id] ?? 0}
          joyKey={joyKey}
          onToggle={toggle}
          onSelectDog={selectDog}
          onAddDog={() => go({ kind: "add" })}
          onCreateCharacter={() => go({ kind: "generate", dogId: dog.id })}
          onOpenPet={() => {
            setTab("pet");
            window.scrollTo({ top: 0 });
          }}
          toast={toast}
          theme={theme}
        />
      ) : (
        <PetScreen
          dog={dog}
          mood={mood}
          points={state.points[dog.id] ?? 0}
          canDelete={state.me?.role === "owner"}
          onEquip={equip}
          onGenerate={() => go({ kind: "generate", dogId: dog.id })}
          onEdit={() => dog.look && go({ kind: "edit", dogId: dog.id, initial: dog.look, generated: false })}
          onDelete={deleteDog}
          toast={toast}
        />
      )}
      <BottomNav tab={tab} onTab={setTab} onSoon={(l) => toast(SOON(l))} />
    </>
  );
}

/* ---------------- Демо-режим: Боня, всё хранится на устройстве ---------------- */

const DEMO_EQUIP_KEY = "syncra:demo:equipped";

function DemoApp({ theme, toast }: { theme: Theme; toast: Toast }) {
  const [now] = useNow();
  const { done, complete, undo } = useDemoDone(now);
  const [joyKey, setJoyKey] = useState(0);
  const [tab, setTab] = useState<TabId>("today");
  const [equipped, setEquipped] = useState<ItemId | null>(() => (safeGet(DEMO_EQUIP_KEY) as ItemId | null) || null);
  const today = isoDate(now);
  const doneCount = DEMO_TASKS.filter((t) => done[t.id]).length;
  const points = DEMO_POINTS_BEFORE + Math.min(doneCount, RULES.maxPointsPerDay);
  const dog: Dog = { ...DEMO_DOG, equipped, unlocked: ITEMS.map((i) => i.id) };

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
    toast(doneCount + 1 === RULES.dailyGoal ? "Цель дня выполнена! 🎉" : `Готово: ${task.title.toLowerCase()} · Боня рада!`);
  };

  const fromTelegram = "Чтобы создать двойника своей собаки, откройте приложение из бота в Telegram";

  return (
    <>
      {tab === "today" ? (
        <TodayScreen
          dog={dog}
          dogs={[dog]}
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
          onAddDog={() => toast(fromTelegram)}
          onOpenPet={() => setTab("pet")}
          toast={toast}
          theme={theme}
          demo
        />
      ) : (
        <PetScreen
          dog={dog}
          mood={computeMood(DEMO_TASKS, done, now)}
          points={points}
          canDelete={false}
          onEquip={(item) => {
            setEquipped(item);
            safeSet(DEMO_EQUIP_KEY, item ?? "");
          }}
          onGenerate={() => toast(fromTelegram)}
          onEdit={() => toast(fromTelegram)}
          onDelete={() => {}}
          toast={toast}
        />
      )}
      <BottomNav tab={tab} onTab={setTab} onSoon={(l) => toast(SOON(l))} />
    </>
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
