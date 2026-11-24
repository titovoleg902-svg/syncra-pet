import { getWebApp } from "./telegram";
import type { Completion, Dog, Member, Role, Task } from "./rules";
import type { DogLook } from "./components/CartoonDog";
import type { ItemId } from "./components/Accessories";

/** Адрес серверной функции. Задаётся при сборке (переменная VITE_API_URL). */
const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");

export interface ServerState {
  me: { id: string; name: string; role: Role } | null;
  family: { id: string; name: string; timezone: string; dailyGoal: number } | null;
  members: Member[];
  dogs: Dog[];
  tasks: Task[];
  done: Record<string, Completion>;
  history: Record<string, number>;
  points: Record<string, number>;
  today: string | null;
  createdDogId?: string;
}

export class ApiError extends Error {}

/** Живой режим: есть сервер и приложение открыто из Telegram (есть подписанные данные входа). */
export function liveModeAvailable(): boolean {
  return Boolean(API_URL && getWebApp()?.initData);
}

async function call(path: string, init: RequestInit = {}): Promise<ServerState> {
  const initData = getWebApp()?.initData ?? "";
  let res: Response;
  try {
    res = await fetch(`${API_URL}/${path}`, {
      ...init,
      headers: { Authorization: `tma ${initData}`, ...(init.headers ?? {}) },
    });
  } catch {
    throw new ApiError("Нет связи. Не сохранено — попробуйте ещё раз");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error ?? "Ошибка сервера, попробуйте ещё раз");
  return body as ServerState;
}

const postJson = (path: string, body: unknown) =>
  call(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const api = {
  session: () => call("session"),
  complete: (taskId: string) => postJson("complete", { taskId }),
  undo: (taskId: string) => postJson("undo", { taskId }),
  saveLook: (dogId: string, look: DogLook, generated: boolean) => postJson("character", { dogId, look, generated }),
  equip: (dogId: string, item: ItemId | null) => postJson("equip", { dogId, item }),
  deleteDog: (dogId: string) => postJson("delete", { dogId }),
  createDog: (data: NewDog, photos: Blob[]) => {
    const form = new FormData();
    form.append("data", JSON.stringify(data));
    photos.forEach((p, i) => form.append("photos", p, `photo-${i}.jpg`));
    return call("dogs", { method: "POST", body: form });
  },
};

export interface NewDog {
  name: string;
  breed: string;
  isMixed: boolean;
  ageYears: number | null;
  weightKg: number | null;
  sex: "male" | "female" | null;
  notes: string;
  starterTasks: boolean;
  timezone: string;
}

/** Сжимаем фото на телефоне до 1280px — быстрее загрузка и меньше места. */
export async function compressPhoto(file: File, maxSide = 1280): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.85));
}
