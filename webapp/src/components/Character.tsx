import calmImg from "../assets/pet/boni-calm.png";
import happyImg from "../assets/pet/boni-happy.png";
import boredImg from "../assets/pet/boni-bored.png";
import type { Dog, Mood } from "../rules";
import { CartoonDog } from "./CartoonDog";
import { ItemIcon, type ItemId } from "./Accessories";
import { Icon } from "./Icon";

export const MOOD_IMAGES: Record<Mood, string> = { calm: calmImg, happy: happyImg, bored: boredImg };

/** Где вещи сидят на картинке демо-Бони (в процентах от кадра). */
const BONI_SLOTS: Record<ItemId, React.CSSProperties> = {
  panama: { left: "12%", top: "-9%", width: "54%" },
  bandana: { left: "18%", top: "43%", width: "46%" },
  "party-hat": { left: "44%", top: "-19%", width: "24%", rotate: "18deg" },
};

/**
 * Персонаж собаки: векторный двойник, картинка демо-Бони или фото (пока двойника нет).
 * item — надетая вещь (можно передать отдельно, чтобы «примерить» без сохранения).
 */
export function Character({ dog, mood, item = dog.equipped ?? null }: { dog: Dog; mood: Mood; item?: ItemId | null }) {
  if (dog.look) return <CartoonDog look={dog.look} mood={mood} item={item} />;

  if (dog.cartoon) {
    return (
      <div className="boni">
        {(Object.keys(MOOD_IMAGES) as Mood[]).map((m) => (
          <img key={m} src={MOOD_IMAGES[m]} alt="" draggable={false} className={`boni__img ${m === mood ? "is-visible" : ""}`} />
        ))}
        {item && <ItemIcon id={item} className="boni__item" style={BONI_SLOTS[item]} />}
      </div>
    );
  }

  if (dog.photoUrl) return <img src={dog.photoUrl} alt={dog.name} draggable={false} className="char-photo" />;
  return (
    <span className="char-photo char-photo--empty">
      <Icon name="paw" size={72} />
    </span>
  );
}
