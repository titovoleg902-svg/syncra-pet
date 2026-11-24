import { useEffect, useState } from "react";
import { MOOD_LABEL, type Dog, type Mood } from "../rules";
import { Icon } from "./Icon";
import { Character } from "./Character";
import type { ItemId } from "./Accessories";

export { MOOD_IMAGES } from "./Character";
export const MOOD_ICON = { calm: "moodCalm", happy: "moodHappy", bored: "moodBored" } as const;

interface Props {
  dog: Dog;
  mood: Mood;
  joyKey: number;
  /** Примерка вещи без сохранения */
  item?: ItemId | null;
  /** Кнопка «Создать двойника», если его ещё нет */
  onCreateCharacter?: () => void;
  size?: "normal" | "large";
}

/**
 * Персонаж на сцене. По ТЗ: дыхание (цикл 3 с), лёгкое покачивание,
 * наклон головы раз в 8–12 с, короткая радостная реакция после выполнения задачи.
 */
export function PetStage({ dog, mood, joyKey, item, onCreateCharacter, size = "normal" }: Props) {
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

  const isPhoto = !dog.look && !dog.cartoon;

  return (
    <section className={`stage stage--${size}`} aria-label={`${dog.name}: ${MOOD_LABEL[mood]}`}>
      <div className="stage__glow" />
      <div className="stage__floor" />
      {mood === "happy" && (
        <div className="stage__sparks" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      )}
      <div className={`pet ${isPhoto ? "pet--photo" : ""} ${joy ? "pet--joy" : ""}`}>
        <div className={`pet__sway ${tilt ? "pet__sway--tilt" : ""}`}>
          <div className="pet__breath">
            <Character dog={dog} mood={mood} item={item === undefined ? dog.equipped ?? null : item} />
          </div>
        </div>
      </div>
      <div className={`mood-chip mood-chip--${mood}`}>
        <Icon name={MOOD_ICON[mood]} size={16} />
        {MOOD_LABEL[mood]}
      </div>
      {isPhoto && onCreateCharacter && (
        <button type="button" className="stage__cta" onClick={onCreateCharacter}>
          <Icon name="star" size={16} /> Создать мультяшного двойника
        </button>
      )}
    </section>
  );
}
