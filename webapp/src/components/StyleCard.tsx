import { useState } from "react";
import { MOOD_LABEL, RULES, type Dog, type Mood } from "../rules";
import { Icon } from "./Icon";
import { MOOD_ICON, MOOD_IMAGES } from "./PetStage";

/** Стартовый набор: 3 аксессуара (ТЗ). Открываются за очки или другим условием. */
const ITEMS = [
  { id: "panama", name: "Панама", emoji: "👒", condition: "За 10 очков", unlockAtPoints: RULES.firstItemPoints as number },
  { id: "bandana", name: "Бандана", emoji: "🧣", condition: "7 дней серии" },
  { id: "party-hat", name: "Колпак", emoji: "🥳", condition: "Пригласить близкого" },
] as { id: string; name: string; emoji: string; condition: string; unlockAtPoints?: number }[];

type Tab = "items" | "emotions";

interface Props {
  dog: Dog;
  points: number;
  mood: Mood;
  onToast: (text: string) => void;
}

const tasksWord = (n: number) => (n === 1 ? "задача" : n >= 2 && n <= 4 ? "задачи" : "задач");

/** «Стиль» питомца: вещи, эмоции и закрытый раздел «Трюки». */
export function StyleCard({ dog, points, mood, onToast }: Props) {
  const [tab, setTab] = useState<Tab>("items");
  const left = Math.max(0, RULES.firstItemPoints - points);

  return (
    <section className="card style">
      <div className="style__reward">
        <span className="style__gift">
          <Icon name="gift" size={22} />
        </span>
        <div className="style__reward-text">
          <div className="style__reward-title">{left > 0 ? `Ещё ${left} ${tasksWord(left)} до награды` : "Панама открыта!"}</div>
          <div className="bar bar--thin">
            <div className="bar__fill bar__fill--lavender" style={{ width: `${Math.min(100, (points / RULES.firstItemPoints) * 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label={`Стиль: ${dog.name}`}>
        <button type="button" role="tab" aria-selected={tab === "items"} className="tabs__tab" onClick={() => setTab("items")}>
          Вещи
        </button>
        <button type="button" role="tab" aria-selected={tab === "emotions"} className="tabs__tab" onClick={() => setTab("emotions")}>
          Эмоции
        </button>
        <button
          type="button"
          className="tabs__tab tabs__tab--locked"
          onClick={() => onToast("Трюки в разработке — появятся в следующих версиях")}
          aria-label="Трюки — в разработке"
        >
          <span className="tabs__locked-title">
            <Icon name="lock" size={14} /> Трюки
          </span>
          <span className="tabs__hint">В разработке</span>
        </button>
      </div>

      {tab === "items" ? (
        <div className="grid">
          {ITEMS.map((item) => {
            const open = item.unlockAtPoints !== undefined && points >= item.unlockAtPoints;
            return (
              <button
                key={item.id}
                type="button"
                className={`tile ${open ? "tile--open" : "tile--locked"}`}
                onClick={() =>
                  onToast(open ? `${item.name} открыта! Надеть можно будет во вкладке «Питомец»` : `Как получить: ${item.condition.toLowerCase()}`)
                }
              >
                {!open && (
                  <span className="tile__lock">
                    <Icon name="lock" size={13} />
                  </span>
                )}
                <span className="tile__emoji">{item.emoji}</span>
                <span className="tile__name">{item.name}</span>
                <span className="tile__cond">{open ? "Открыто" : item.condition}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid">
          {(Object.keys(MOOD_LABEL) as Mood[]).map((m) => (
            <div key={m} className={`tile tile--mood ${m === mood ? "tile--current" : ""}`}>
              {dog.cartoon ? (
                <img src={MOOD_IMAGES[m]} alt="" className="tile__img" />
              ) : (
                <span className="tile__mood-icon">
                  <Icon name={MOOD_ICON[m]} size={40} />
                </span>
              )}
              <span className="tile__name">{MOOD_LABEL[m]}</span>
              {m === mood && <span className="tile__cond">Сейчас</span>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
