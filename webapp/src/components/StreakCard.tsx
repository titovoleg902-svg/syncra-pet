import { RULES } from "../demo";
import { Icon } from "./Icon";

const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function daysWord(n: number) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "день";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "дня";
  return "дней";
}

interface Props {
  streak: number;
  doneCount: number;
  now: Date;
  onOpen: () => void;
}

/** Карточка «Серия семьи»: цель дня и семь отметок недели. */
export function StreakCard({ streak, doneCount, now, onOpen }: Props) {
  const goal = RULES.dailyGoal;
  const reached = doneCount >= goal;
  const todayIdx = (now.getDay() + 6) % 7; // понедельник = 0

  return (
    <button type="button" className="card streak" onClick={onOpen}>
      <div className="streak__head">
        <span className="streak__flame">
          <Icon name="flame" size={20} />
        </span>
        <span className="streak__title">
          Серия семьи · {streak} {daysWord(streak)}
        </span>
        <Icon name="chevronRight" size={18} />
      </div>
      <div className="streak__goal">
        {reached ? "Цель дня выполнена! Отличная командная работа" : `Сегодня ${doneCount} из ${goal} задач`}
      </div>
      <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(doneCount, goal)}>
        <div className="bar__fill bar__fill--green" style={{ width: `${(Math.min(doneCount, goal) / goal) * 100}%` }} />
      </div>
      <div className="week">
        {DAYS.map((d, i) => {
          // Демо: прошедшие дни недели закрыты, сегодня — по факту.
          const state = i < todayIdx ? "done" : i === todayIdx ? (reached ? "done" : "today") : "future";
          return (
            <div key={d} className="week__day">
              <span className="week__label">{d}</span>
              <span className={`week__dot week__dot--${state}`}>{state === "done" && <Icon name="check" size={14} />}</span>
            </div>
          );
        })}
      </div>
    </button>
  );
}
