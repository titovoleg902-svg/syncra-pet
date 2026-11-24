import { useState } from "react";
import { MAX_LOOK_ATTEMPTS, MOOD_LABEL, RULES, type Dog, type Mood } from "../rules";
import { haptic } from "../telegram";
import { ITEMS, ItemIcon, type ItemId } from "../components/Accessories";
import { Character } from "../components/Character";
import { Icon } from "../components/Icon";
import { PetStage, MOOD_ICON } from "../components/PetStage";

type Tab = "items" | "emotions";

interface Props {
  dog: Dog;
  mood: Mood;
  points: number;
  canDelete: boolean;
  onEquip: (item: ItemId | null) => void;
  onGenerate: () => void;
  onEdit: () => void;
  onDelete: () => void;
  toast: (text: string) => void;
}

const tasksWord = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? "задача" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "задачи" : "задач");

/** «Стиль питомца»: персонаж, вещи, эмоции, закрытые «Трюки», профиль собаки. */
export function PetScreen({ dog, mood, points, canDelete, onEquip, onGenerate, onEdit, onDelete, toast }: Props) {
  const [tab, setTab] = useState<Tab>("items");
  const [previewMood, setPreviewMood] = useState<Mood | null>(null);
  const shownMood = previewMood ?? mood;
  const hasCharacter = Boolean(dog.look || dog.cartoon);
  const unlocked = new Set(dog.unlocked ?? []);
  const left = Math.max(0, RULES.firstItemPoints - points);
  const attemptsLeft = MAX_LOOK_ATTEMPTS - (dog.lookAttempts ?? 0);

  const tapItem = (id: ItemId, condition: string) => {
    if (!hasCharacter) return toast("Сначала создайте мультяшного двойника");
    if (!unlocked.has(id)) return toast(`Как получить: ${condition.toLowerCase()}`);
    haptic.select();
    onEquip(dog.equipped === id ? null : id);
  };

  return (
    <main className="content">
      <div className="screen-head">
        <span className="screen-head__icon">
          <Icon name="paw" size={28} />
        </span>
        <div>
          <h1>Стиль: {dog.name}</h1>
          <p className="muted">Подберите вещи и эмоции для питомца</p>
        </div>
      </div>

      <PetStage dog={dog} mood={shownMood} joyKey={0} size="large" onCreateCharacter={onGenerate} />

      {hasCharacter && (
        <div className="mood-row">
          {(Object.keys(MOOD_LABEL) as Mood[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`mood-row__item ${shownMood === m ? "is-on" : ""}`}
              onClick={() => setPreviewMood(m === mood ? null : m)}
            >
              <span className="mood-row__pic">
                <Character dog={dog} mood={m} />
              </span>
              {MOOD_LABEL[m]}
            </button>
          ))}
        </div>
      )}

      <div className="card style__reward">
        <span className="style__gift">
          <Icon name="gift" size={22} />
        </span>
        <div className="style__reward-text">
          <div className="style__reward-title">{left > 0 ? `Ещё ${left} ${tasksWord(left)} до награды` : "Первая награда получена!"}</div>
          <div className="bar bar--thin">
            <div className="bar__fill bar__fill--lavender" style={{ width: `${Math.min(100, (points / RULES.firstItemPoints) * 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "items"} className="tabs__tab" onClick={() => setTab("items")}>
          Вещи
        </button>
        <button type="button" role="tab" aria-selected={tab === "emotions"} className="tabs__tab" onClick={() => setTab("emotions")}>
          Эмоции
        </button>
        <button type="button" className="tabs__tab tabs__tab--locked" onClick={() => toast("Трюки в разработке — появятся в следующих версиях")}>
          <span className="tabs__locked-title">
            <Icon name="lock" size={14} /> Трюки
          </span>
          <span className="tabs__hint">В разработке</span>
        </button>
      </div>

      {tab === "items" ? (
        <div className="grid">
          {ITEMS.map((it) => {
            const open = unlocked.has(it.id);
            const on = dog.equipped === it.id;
            return (
              <button
                key={it.id}
                type="button"
                className={`tile ${open ? "tile--open" : "tile--locked"} ${on ? "tile--current" : ""}`}
                aria-pressed={on}
                onClick={() => tapItem(it.id, it.condition)}
              >
                <span className="tile__lock">{open ? on && <Icon name="check" size={15} /> : <Icon name="lock" size={13} />}</span>
                <ItemIcon id={it.id} className="tile__art" />
                <span className="tile__name">{it.name}</span>
                <span className="tile__cond">{!open ? it.condition : on ? "Надето" : "Надеть"}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid">
          {(Object.keys(MOOD_LABEL) as Mood[]).map((m) => (
            <button key={m} type="button" className={`tile tile--mood ${m === shownMood ? "tile--current" : ""}`} onClick={() => setPreviewMood(m === mood ? null : m)}>
              {hasCharacter ? (
                <span className="tile__pic">
                  <Character dog={dog} mood={m} />
                </span>
              ) : (
                <span className="tile__mood-icon">
                  <Icon name={MOOD_ICON[m]} size={40} />
                </span>
              )}
              <span className="tile__name">{MOOD_LABEL[m]}</span>
              <span className="tile__cond">{m === mood ? "Сейчас" : "Открыто"}</span>
            </button>
          ))}
        </div>
      )}
      <p className="muted small center">Настроение меняется само: радуется 30 минут после выполненной задачи, скучает при просроченных.</p>

      <button type="button" className="btn-primary" onClick={() => toast("Приглашения появятся на следующем этапе")}>
        <Icon name="plus" size={20} /> Пригласить близкого
      </button>

      {!dog.cartoon && (
        <section className="card profile">
          <h2 className="profile__title">Профиль</h2>
          <Row label="Порода" value={dog.breed} />
          <Row label="Возраст" value={dog.ageYears ? `${dog.ageYears} г.` : null} />
          <Row label="Вес" value={dog.weightKg ? `${dog.weightKg} кг` : null} />
          <Row label="Пол" value={dog.sex === "male" ? "Мальчик" : dog.sex === "female" ? "Девочка" : null} />
          <Row label="Особенности" value={dog.notes} />
          <div className="profile__actions">
            {dog.look && (
              <button type="button" className="btn-secondary" onClick={onEdit}>
                Изменить внешность
              </button>
            )}
            {(dog.look ? attemptsLeft > 0 : true) && (
              <button type="button" className="btn-secondary" onClick={onGenerate}>
                {dog.look ? `Создать заново по фото (ещё ${attemptsLeft})` : "Создать двойника по фото"}
              </button>
            )}
            {canDelete && (
              <button type="button" className="btn-danger" onClick={onDelete}>
                Удалить собаку
              </button>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="profile__row">
      <span className="muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
