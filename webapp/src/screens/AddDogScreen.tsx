import { useEffect, useRef, useState } from "react";
import { api, ApiError, compressPhoto, type ServerState } from "../api";
import { haptic } from "../telegram";
import { Icon } from "../components/Icon";

const MAX_PHOTOS = 3;

interface Props {
  firstDog: boolean;
  onCreated: (state: ServerState) => void;
  onCancel?: () => void;
}

/**
 * Создание собаки (ТЗ стр. 1 и 12): фото 1–3, кличка, порода или «метис» — обязательны кличка и порода/метис.
 * Первая собака заодно создаёт семью, пользователь становится её владельцем.
 */
export function AddDogScreen({ firstDog, onCreated, onCancel }: Props) {
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [isMixed, setIsMixed] = useState(false);
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [sex, setSex] = useState<"male" | "female" | null>(null);
  const [notes, setNotes] = useState("");
  const [starterTasks, setStarterTasks] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Освобождаем память превью только при закрытии экрана.
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const next = [...photos];
    for (const file of Array.from(files)) {
      if (next.length >= MAX_PHOTOS) break;
      if (file.type.startsWith("image/")) next.push({ file, url: URL.createObjectURL(file) });
    }
    setPhotos(next);
  };

  const removePhoto = (i: number) => {
    URL.revokeObjectURL(photos[i].url);
    setPhotos(photos.filter((_, j) => j !== i));
  };

  const canSubmit = name.trim() && (isMixed || breed.trim()) && !busy;

  const submit = async () => {
    if (!canSubmit) {
      setError(!name.trim() ? "Укажите кличку" : "Укажите породу или выберите «Метис»");
      haptic.tap();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const blobs = await Promise.all(photos.map((p) => compressPhoto(p.file)));
      const state = await api.createDog(
        {
          name: name.trim(),
          breed: breed.trim(),
          isMixed,
          ageYears: age ? Number(age.replace(",", ".")) : null,
          weightKg: weight ? Number(weight.replace(",", ".")) : null,
          sex,
          notes: notes.trim(),
          starterTasks,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        blobs,
      );
      haptic.success();
      onCreated(state);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не получилось сохранить. Попробуйте ещё раз");
      setBusy(false);
    }
  };

  return (
    <main className="content add-dog">
      <div className="screen-head">
        <span className="screen-head__icon">
          <Icon name="paw" size={30} />
        </span>
        <div>
          <h1>Добавить собаку</h1>
          <p className="muted">Создайте профиль питомца, чтобы заботиться о нём вместе с семьёй</p>
        </div>
      </div>

      <section className="photo-box">
        {photos.length ? (
          <div className="photo-box__list">
            {photos.map((p, i) => (
              <div key={p.url} className="photo-box__item">
                <img src={p.url} alt={`Фото ${i + 1}`} />
                <button type="button" className="photo-box__remove" onClick={() => removePhoto(i)} aria-label="Убрать фото">
                  <Icon name="x" size={14} />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button type="button" className="photo-box__add" onClick={() => fileInput.current?.click()} aria-label="Добавить ещё фото">
                <Icon name="plus" size={26} />
              </button>
            )}
          </div>
        ) : (
          <button type="button" className="photo-box__empty" onClick={() => fileInput.current?.click()}>
            <span className="photo-box__icon">
              <Icon name="camera" size={30} />
            </span>
            <span className="photo-box__title">Добавьте 1–3 фото</span>
            <span className="muted small">Одна собака в кадре, хорошо видна мордочка — по ним позже нарисуем мультяшного двойника</span>
          </button>
        )}
        <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
      </section>

      <div className="form">
        <label className="field">
          <span className="field__label">Кличка *</span>
          <input className="field__input" value={name} maxLength={40} placeholder="Например, Боня" onChange={(e) => setName(e.target.value)} />
        </label>

        <div className="field">
          <span className="field__label">Порода *</span>
          <div className="field__row">
            <input
              className="field__input"
              value={isMixed ? "" : breed}
              maxLength={60}
              disabled={isMixed}
              placeholder={isMixed ? "Метис" : "Например, бигль"}
              onChange={(e) => setBreed(e.target.value)}
            />
            <button type="button" className={`chip-toggle ${isMixed ? "is-on" : ""}`} aria-pressed={isMixed} onClick={() => setIsMixed(!isMixed)}>
              {isMixed && <Icon name="check" size={14} />} Метис
            </button>
          </div>
        </div>

        <div className="field__pair">
          <label className="field">
            <span className="field__label">Возраст, лет</span>
            <input className="field__input" inputMode="decimal" value={age} placeholder="2" onChange={(e) => setAge(e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Вес, кг</span>
            <input className="field__input" inputMode="decimal" value={weight} placeholder="8,5" onChange={(e) => setWeight(e.target.value)} />
          </label>
        </div>

        <div className="field">
          <span className="field__label">Пол</span>
          <div className="segmented segmented--two" role="radiogroup" aria-label="Пол">
            {(
              [
                ["male", "Мальчик"],
                ["female", "Девочка"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={sex === v}
                className="segmented__item"
                onClick={() => setSex(sex === v ? null : v)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span className="field__label">Особенности</span>
          <textarea
            className="field__input field__input--area"
            value={notes}
            maxLength={500}
            placeholder="Характер, аллергии, привычки"
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <label className="checkline">
          <input type="checkbox" checked={starterTasks} onChange={(e) => setStarterTasks(e.target.checked)} />
          <span>
            Добавить первые задачи: покормить в 08:00, прогулка в 14:00, поиграть в 19:00
            <span className="muted small"> — на вас, потом можно изменить</span>
          </span>
        </label>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <button type="button" className="btn-primary" onClick={submit} disabled={busy} aria-disabled={!canSubmit}>
        {busy ? (
          "Сохраняем…"
        ) : (
          <>
            <Icon name="plus" size={20} /> {firstDog ? "Создать питомца" : "Добавить собаку"}
          </>
        )}
      </button>
      {onCancel && (
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>
          Отмена
        </button>
      )}
    </main>
  );
}
