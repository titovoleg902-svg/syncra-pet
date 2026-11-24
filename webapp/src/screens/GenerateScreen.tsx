import { useEffect, useState } from "react";
import { generateLook } from "../lookFromPhoto";
import { MAX_LOOK_ATTEMPTS, type Dog } from "../rules";
import { haptic } from "../telegram";
import type { DogLook } from "../components/CartoonDog";
import { CartoonDog } from "../components/CartoonDog";
import { Icon } from "../components/Icon";

const STEPS = ["Смотрим на фото…", "Подбираем окрас…", "Рисуем уши и мордочку…", "Добавляем характер…"];
const DURATION = 3600;

interface Props {
  dog: Dog;
  onSave: (look: DogLook) => Promise<void>;
  onEdit: (look: DogLook) => void;
  onSkip: () => void;
}

/**
 * ТЗ: фото → генерация → предпросмотр → «Сохранить» или «Повторить».
 * Первая генерация и две повторные попытки; задачами можно пользоваться сразу.
 */
export function GenerateScreen({ dog, onSave, onEdit, onSkip }: Props) {
  const [variant, setVariant] = useState(0);
  const [look, setLook] = useState<DogLook | null>(null);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const retriesLeft = Math.max(0, Math.min(2 - variant, MAX_LOOK_ATTEMPTS - 1 - (dog.lookAttempts ?? 0) - variant));

  useEffect(() => {
    let cancelled = false;
    setLook(null);
    setProgress(0);
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const p = Math.min(99, ((performance.now() - start) / DURATION) * 100);
      setProgress(p);
      if (p < 99) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const work = generateLook(dog.photoUrl, dog.breed, variant);
    const wait = new Promise((r) => setTimeout(r, DURATION));
    Promise.all([work, wait]).then(([l]) => {
      if (cancelled) return;
      cancelAnimationFrame(raf);
      setProgress(100);
      setLook(l);
      haptic.success();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [dog.photoUrl, dog.breed, variant]);

  const save = async () => {
    if (!look) return;
    setSaving(true);
    try {
      await onSave(look);
    } finally {
      setSaving(false);
    }
  };

  const step = STEPS[Math.min(STEPS.length - 1, Math.floor((progress / 100) * STEPS.length))];

  return (
    <main className="content generate">
      <div className="screen-head">
        <span className="screen-head__icon">
          <Icon name="star" size={28} />
        </span>
        <div>
          <h1>{look ? `${dog.name} готов!` : "Создаём персонажа"}</h1>
          <p className="muted">{look ? "Так выглядит мультяшный двойник. Сохраним?" : `Готовим уникального мультяшного ${dog.name}`}</p>
        </div>
      </div>

      <section className="stage stage--large">
        <div className="stage__glow" />
        <div className="stage__floor" />
        <div className={`gen-figure ${look ? "is-ready" : ""}`}>
          {look ? (
            <CartoonDog look={look} mood="happy" />
          ) : (
            <div className="gen-photo">
              {dog.photoUrl ? <img src={dog.photoUrl} alt="" /> : <Icon name="paw" size={64} />}
              <span className="gen-scan" />
            </div>
          )}
        </div>
      </section>

      {!look ? (
        <>
          <div className="gen-progress">
            <div className="gen-progress__num">{Math.round(progress)}%</div>
            <div className="bar">
              <div className="bar__fill bar__fill--lavender" style={{ width: `${progress}%`, transition: "none" }} />
            </div>
            <p className="muted">{step}</p>
          </div>
          <div className="card info-card">
            <Icon name="check" size={20} />
            <span>Задачами уже можно пользоваться</span>
          </div>
          <button type="button" className="btn-primary" onClick={onSkip}>
            <Icon name="chevronRight" size={20} /> Перейти к задачам
          </button>
        </>
      ) : (
        <>
          <button type="button" className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Сохраняем…" : (
              <>
                <Icon name="check" size={20} /> Сохранить
              </>
            )}
          </button>
          <div className="btn-row">
            <button
              type="button"
              className="btn-secondary"
              disabled={retriesLeft === 0 || saving}
              onClick={() => {
                haptic.tap();
                setVariant((v) => v + 1);
              }}
            >
              Повторить{retriesLeft ? ` (ещё ${retriesLeft})` : ""}
            </button>
            <button type="button" className="btn-secondary" disabled={saving} onClick={() => onEdit(look)}>
              Настроить вручную
            </button>
          </div>
          {retriesLeft === 0 && <p className="muted small center">Попытки закончились — поправьте внешность вручную в конструкторе.</p>}
        </>
      )}
    </main>
  );
}
