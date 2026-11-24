import { useEffect, useState } from "react";
import calmImg from "../assets/pet/boni-calm.png";
import happyImg from "../assets/pet/boni-happy.png";
import boredImg from "../assets/pet/boni-bored.png";
import { MOOD_LABEL, type Dog, type Mood } from "../rules";
import { Icon } from "./Icon";

export const MOOD_IMAGES: Record<Mood, string> = { calm: calmImg, happy: happyImg, bored: boredImg };
export const MOOD_ICON = { calm: "moodCalm", happy: "moodHappy", bored: "moodBored" } as const;

/**
 * Персонаж на экране «Сегодня». По ТЗ: дыхание (цикл 3 с), лёгкое покачивание,
 * наклон головы раз в 8–12 с, короткая радостная реакция после выполнения задачи.
 * Пока мультяшного двойника нет (генерация — этап 6), показываем фото собаки в круге.
 */
export function PetStage({ dog, mood, joyKey }: { dog: Dog; mood: Mood; joyKey: number }) {
  const [tilt, setTilt] = useState(false);
  const [joy, setJoy] = useState(false);

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

  useEffect(() => {
    if (!joyKey) return;
    setJoy(true);
    const t = window.setTimeout(() => setJoy(false), 900);
    return () => window.clearTimeout(t);
  }, [joyKey]);

  return (
    <section className="stage" aria-label={`${dog.name}: ${MOOD_LABEL[mood]}`}>
      <div className="stage__glow" />
      <div className="stage__floor" />
      {mood === "happy" && (
        <div className="stage__sparks" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      )}
      <div className={`pet ${dog.cartoon ? "" : "pet--photo"} ${joy ? "pet--joy" : ""}`}>
        <div className={`pet__sway ${tilt ? "pet__sway--tilt" : ""}`}>
          <div className="pet__breath">
            {dog.cartoon ? (
              (Object.keys(MOOD_IMAGES) as Mood[]).map((m) => (
                <img
                  key={m}
                  src={MOOD_IMAGES[m]}
                  alt=""
                  draggable={false}
                  className={`pet__img ${m === mood ? "is-visible" : ""}`}
                />
              ))
            ) : dog.photoUrl ? (
              <img src={dog.photoUrl} alt={dog.name} draggable={false} className="pet__photo" />
            ) : (
              <span className="pet__placeholder">
                <Icon name="paw" size={72} />
              </span>
            )}
          </div>
        </div>
      </div>
      <div className={`mood-chip mood-chip--${mood}`}>
        <Icon name={MOOD_ICON[mood]} size={16} />
        {MOOD_LABEL[mood]}
      </div>
      {!dog.cartoon && <div className="stage__soon">Мультяшный двойник — скоро</div>}
    </section>
  );
}
