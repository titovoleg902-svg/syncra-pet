import { useEffect, useState } from "react";
import calmImg from "../assets/pet/boni-calm.png";
import happyImg from "../assets/pet/boni-happy.png";
import boredImg from "../assets/pet/boni-bored.png";
import { MOOD_LABEL, type Mood } from "../demo";
import { Icon } from "./Icon";

export const MOOD_IMAGES: Record<Mood, string> = { calm: calmImg, happy: happyImg, bored: boredImg };
const MOOD_ICON = { calm: "moodCalm", happy: "moodHappy", bored: "moodBored" } as const;

/**
 * Персонаж на экране «Сегодня». По ТЗ: одна картинка в фиксированном ракурсе,
 * дыхание (цикл 3 с), лёгкое покачивание, наклон головы раз в 8–12 с,
 * короткая радостная реакция после выполнения задачи.
 * Три картинки настроения лежат друг на друге и плавно сменяются.
 */
export function PetStage({ mood, name, joyKey }: { mood: Mood; name: string; joyKey: number }) {
  const [tilt, setTilt] = useState(false);
  const [joy, setJoy] = useState(false);

  // Наклон головы через случайный интервал 8–12 секунд.
  useEffect(() => {
    let timer: number;
    const schedule = () => {
      timer = window.setTimeout(() => {
        setTilt(true);
        window.setTimeout(() => setTilt(false), 1400);
        schedule();
      }, 8000 + Math.random() * 4000);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, []);

  // Радостный прыжок при каждой новой отметке.
  useEffect(() => {
    if (!joyKey) return;
    setJoy(true);
    const t = window.setTimeout(() => setJoy(false), 900);
    return () => window.clearTimeout(t);
  }, [joyKey]);

  return (
    <section className="stage" aria-label={`${name}: ${MOOD_LABEL[mood]}`}>
      <div className="stage__glow" />
      <div className="stage__floor" />
      {mood === "happy" && (
        <div className="stage__sparks" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      )}
      <div className={`pet ${joy ? "pet--joy" : ""}`}>
        <div className={`pet__sway ${tilt ? "pet__sway--tilt" : ""}`}>
          <div className="pet__breath">
            {(Object.keys(MOOD_IMAGES) as Mood[]).map((m) => (
              <img
                key={m}
                src={MOOD_IMAGES[m]}
                alt=""
                draggable={false}
                className={`pet__img ${m === mood ? "is-visible" : ""}`}
              />
            ))}
          </div>
        </div>
      </div>
      <div className={`mood-chip mood-chip--${mood}`}>
        <Icon name={MOOD_ICON[mood]} size={16} />
        {MOOD_LABEL[mood]}
      </div>
    </section>
  );
}
