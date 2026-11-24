import { useState } from "react";
import { CartoonDog, type DogLook, type EarType, type Pattern } from "../components/CartoonDog";
import { Icon } from "../components/Icon";
import { MOOD_LABEL, type Mood } from "../rules";
import { haptic } from "../telegram";

/** Окрасы собак: от белого до чёрного. */
const PALETTE = [
  "#FFFFFF", "#F3E6CF", "#E8C38C", "#E3B871", "#D9893E", "#C99254", "#B07A3E",
  "#8A5A33", "#5C3A26", "#A9A9B0", "#7A7F8C", "#4B5663", "#2E2A2B", "#1C1A1D",
];
const EYES = [
  ["#2B1D18", "Карие"],
  ["#141218", "Тёмные"],
  ["#5B8FC9", "Голубые"],
] as const;

type ColorKey = "base" | "body" | "light" | "ear" | "patternColor";
const COLOR_TARGETS: [ColorKey, string][] = [
  ["base", "Голова и лапы"],
  ["body", "Спина"],
  ["light", "Мордочка, грудь"],
  ["ear", "Уши"],
  ["patternColor", "Пятна"],
];

interface Props {
  name: string;
  initial: DogLook;
  onSave: (look: DogLook) => Promise<void>;
  onCancel: () => void;
}

export function LookEditor({ name, initial, onSave, onCancel }: Props) {
  const [look, setLook] = useState<DogLook>(initial);
  const [target, setTarget] = useState<ColorKey>("base");
  const [mood, setMood] = useState<Mood>("calm");
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof DogLook>(k: K, v: DogLook[K]) => {
    haptic.select();
    setLook((l) => ({ ...l, [k]: v }));
  };

  return (
    <main className="content editor">
      <div className="screen-head">
        <span className="screen-head__icon">
          <Icon name="paw" size={28} />
        </span>
        <div>
          <h1>Внешность: {name}</h1>
          <p className="muted">Поправьте окрас, уши и шерсть — изменения видны сразу</p>
        </div>
      </div>

      <section className="editor__preview">
        <CartoonDog look={look} mood={mood} />
        <div className="segmented editor__moods" role="radiogroup" aria-label="Настроение">
          {(Object.keys(MOOD_LABEL) as Mood[]).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={mood === m} className="segmented__item" onClick={() => setMood(m)}>
              {MOOD_LABEL[m]}
            </button>
          ))}
        </div>
      </section>

      <Group label="Уши">
        <Choice<EarType>
          value={look.earType}
          onChange={(v) => set("earType", v)}
          options={[
            ["pointy", "Стоячие"],
            ["semi", "Полустоячие"],
            ["floppy", "Висячие"],
          ]}
        />
      </Group>

      <Group label="Шерсть">
        <Choice<"short" | "long">
          value={look.fluffy ? "long" : "short"}
          onChange={(v) => set("fluffy", v === "long")}
          options={[
            ["short", "Короткая"],
            ["long", "Длинная"],
          ]}
        />
      </Group>

      <Group label="Рисунок">
        <Choice<Pattern>
          value={look.pattern}
          onChange={(v) => set("pattern", v)}
          options={[
            ["none", "Нет"],
            ["patch", "Пятно у глаза"],
            ["spots", "Пятнышки"],
            ["blaze", "Полоска"],
          ]}
        />
      </Group>

      <Group label="Окрас">
        <div className="chips">
          {COLOR_TARGETS.filter(([k]) => k !== "patternColor" || look.pattern === "patch" || look.pattern === "spots").map(([k, label]) => (
            <button key={k} type="button" className={`chip ${target === k ? "is-on" : ""}`} onClick={() => setTarget(k)}>
              <span className="chip__dot" style={{ background: look[k] }} />
              {label}
            </button>
          ))}
        </div>
        <div className="swatches">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              className={`swatch ${look[target].toLowerCase() === c.toLowerCase() ? "is-on" : ""}`}
              style={{ background: c }}
              aria-label={`Цвет ${c}`}
              onClick={() => set(target, c)}
            />
          ))}
        </div>
      </Group>

      <Group label="Глаза">
        <Choice<string> value={look.eye} onChange={(v) => set("eye", v)} options={EYES.map(([c, l]) => [c, l] as [string, string])} />
      </Group>

      <button
        type="button"
        className="btn-primary"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          try {
            await onSave(look);
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? "Сохраняем…" : (
          <>
            <Icon name="check" size={20} /> Сохранить
          </>
        )}
      </button>
      <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>
        Отмена
      </button>
    </main>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      {children}
    </div>
  );
}

function Choice<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="segmented" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }} role="radiogroup">
      {options.map(([v, label]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} className="segmented__item" onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}
