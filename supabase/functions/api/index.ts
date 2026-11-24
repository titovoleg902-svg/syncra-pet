// Syncra PET API — Supabase Edge Function (Deno).
// Каждый запрос Mini App приходит с заголовком `Authorization: tma <initData>`.
// Подпись initData проверяется токеном бота — так сервер точно знает, кто из Telegram пишет.
import { createClient } from "npm:@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("BOT_TOKEN") ?? "";
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "*").split(",").map((s) => s.trim());
const BUCKET = "dog-photos";
const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const COLORS = ["#E99380", "#9C8BD0", "#7FAE8A", "#E3B261", "#6FA8C9", "#C98BB9"];

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

/* ---------------- Проверка входа Telegram ---------------- */

interface TgUser {
  id: number;
  first_name: string;
  last_name?: string;
}

const enc = new TextEncoder();

async function hmac(key: Uint8Array | string, data: string): Promise<Uint8Array> {
  const raw = typeof key === "string" ? enc.encode(key) : key;
  const k = await crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

async function verifyInitData(initData: string): Promise<TgUser | null> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash || !BOT_TOKEN) return null;
  params.delete("hash");
  const checkString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secret = await hmac("WebAppData", BOT_TOKEN);
  if (hex(await hmac(secret, checkString)) !== hash) return null;
  const authDate = Number(params.get("auth_date") ?? 0);
  if (Date.now() / 1000 - authDate > 7 * 24 * 3600) return null; // вход старше недели — просим переоткрыть
  const user = params.get("user");
  return user ? (JSON.parse(user) as TgUser) : null;
}

/* ---------------- Утилиты ---------------- */

function cors(req: Request): HeadersInit {
  const origin = req.headers.get("origin") ?? "";
  const allow = ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin) ? origin || "*" : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  };
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function todayIn(timezone: string, date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function validTimezone(tz: unknown): string {
  try {
    if (typeof tz === "string" && tz) {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return tz;
    }
  } catch {
    /* неизвестный пояс */
  }
  return "Europe/Moscow";
}

const must = <T>(res: { data: T; error: { message: string } | null }): T => {
  if (res.error) throw new HttpError(500, res.error.message);
  return res.data;
};

/* ---------------- Состояние для экрана ---------------- */

async function myMember(user: TgUser) {
  return must(
    await db
      .from("members")
      .select("id, family_id, name, role, color")
      .eq("telegram_id", user.id)
      .order("created_at")
      .limit(1)
      .maybeSingle(),
  );
}

async function loadState(user: TgUser) {
  const me = await myMember(user);
  if (!me) return { me: null, family: null, members: [], dogs: [], tasks: [], done: {}, history: {}, points: {}, today: null };

  const family = must(await db.from("families").select("id, name, timezone, daily_goal").eq("id", me.family_id).single());
  const members = must(await db.from("members").select("id, name, role, color").eq("family_id", family.id).order("created_at"));
  const dogs = must(
    await db
      .from("dogs")
      .select("id, name, breed, is_mixed, age_years, weight_kg, sex, notes, photo_paths, character_look, character_attempts, equipped_item")
      .eq("family_id", family.id)
      .order("created_at"),
  );
  const dogIds = dogs.map((d) => d.id);
  const tasks = dogIds.length
    ? must(
        await db
          .from("tasks")
          .select("id, dog_id, title, category, time, assignee_id")
          .in("dog_id", dogIds)
          .eq("active", true)
          .order("time"),
      )
    : [];

  const today = todayIn(family.timezone);
  const since = shiftDate(today, -60);
  const taskIds = tasks.map((t) => t.id);
  const comps = taskIds.length
    ? must(await db.from("completions").select("task_id, date, by_name, done_at").in("task_id", taskIds).gte("date", since))
    : [];

  // Отметки за сегодня, счётчик выполненных задач по дням (для серии семьи) и очки по собакам.
  const dogOfTask = new Map(tasks.map((t) => [t.id, t.dog_id]));
  const done: Record<string, { by: string; at: number }> = {};
  const history: Record<string, number> = {};
  const perDogDay = new Map<string, number>();
  for (const c of comps) {
    if (c.date === today) done[c.task_id] = { by: c.by_name, at: Date.parse(c.done_at) };
    history[c.date] = (history[c.date] ?? 0) + 1;
    const key = `${dogOfTask.get(c.task_id)}|${c.date}`;
    perDogDay.set(key, (perDogDay.get(key) ?? 0) + 1);
  }
  const points: Record<string, number> = {};
  for (const [key, n] of perDogDay) {
    const dogId = key.split("|")[0];
    points[dogId] = (points[dogId] ?? 0) + Math.min(n, 5); // максимум 5 очков в день на собаку (ТЗ)
  }

  // Временные ссылки на первое фото каждой собаки (на сутки).
  const firstPhotos = dogs.map((d) => d.photo_paths?.[0]).filter(Boolean) as string[];
  const signed = firstPhotos.length ? must(await db.storage.from(BUCKET).createSignedUrls(firstPhotos, 24 * 3600)) : [];
  const urlOf = new Map(signed.map((s) => [s.path, s.signedUrl]));

  return {
    me: { id: me.id, name: me.name, role: me.role },
    family: { id: family.id, name: family.name, timezone: family.timezone, dailyGoal: family.daily_goal },
    members,
    dogs: dogs.map((d) => ({
      id: d.id,
      name: d.name,
      breed: d.is_mixed ? "Метис" : d.breed,
      ageYears: d.age_years,
      weightKg: d.weight_kg,
      sex: d.sex,
      notes: d.notes,
      photoUrl: d.photo_paths?.[0] ? urlOf.get(d.photo_paths[0]) ?? null : null,
      look: d.character_look ?? null,
      lookAttempts: d.character_attempts ?? 0,
      equipped: d.equipped_item ?? null,
      unlocked: unlockedItems(points[d.id] ?? 0, familyStreak(history, today, family.daily_goal)),
    })),
    tasks: tasks.map((t) => ({
      id: t.id,
      dogId: t.dog_id,
      title: t.title,
      category: t.category,
      time: t.time,
      assigneeId: t.assignee_id,
    })),
    done,
    history,
    points,
    today,
  };
}

/* ---------------- Вещи и персонаж ---------------- */

const ITEM_IDS = ["panama", "bandana", "party-hat"] as const;
// Пока идёт тестирование, все вещи открыты (ТЗ: пороги наград настраиваются в проекте).
const UNLOCK_ALL = (Deno.env.get("UNLOCK_ALL_ITEMS") ?? "false") === "true";

function familyStreak(history: Record<string, number>, today: string, goal: number): number {
  let streak = (history[today] ?? 0) >= goal ? 1 : 0;
  for (let d = shiftDate(today, -1); (history[d] ?? 0) >= goal; d = shiftDate(d, -1)) streak++;
  return streak;
}

/** Панама — 10 очков (ТЗ: первый предмет за 10 очков), бандана — 3 дня серии, колпак — за приглашение (позже). */
function unlockedItems(points: number, streak: number): string[] {
  if (UNLOCK_ALL) return [...ITEM_IDS];
  const out: string[] = [];
  if (points >= 10) out.push("panama");
  if (streak >= 3) out.push("bandana");
  return out;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

function validLook(raw: unknown) {
  // deno-lint-ignore no-explicit-any
  const l = raw as any;
  if (!l || typeof l !== "object") throw new HttpError(400, "Нет параметров внешности");
  for (const k of ["base", "body", "light", "ear", "patternColor", "nose", "eye"]) {
    if (typeof l[k] !== "string" || !HEX.test(l[k])) throw new HttpError(400, `Неверный цвет: ${k}`);
  }
  if (!["pointy", "floppy", "semi"].includes(l.earType)) throw new HttpError(400, "Неверный тип ушей");
  if (!["none", "patch", "spots", "blaze"].includes(l.pattern)) throw new HttpError(400, "Неверный рисунок");
  return {
    base: l.base, body: l.body, light: l.light, ear: l.ear, earType: l.earType,
    pattern: l.pattern, patternColor: l.patternColor, fluffy: Boolean(l.fluffy), nose: l.nose, eye: l.eye,
  };
}

/** Собака из семьи пользователя (иначе 404). */
async function dogInMyFamily(user: TgUser, dogId: unknown) {
  const me = await myMember(user);
  if (!me || typeof dogId !== "string") throw new HttpError(404, "Собака не найдена");
  const dog = must(await db.from("dogs").select("id, family_id, photo_paths, character_attempts").eq("id", dogId).maybeSingle());
  if (!dog || dog.family_id !== me.family_id) throw new HttpError(404, "Собака не найдена");
  return { me, dog };
}

async function saveLook(user: TgUser, body: { dogId?: string; look?: unknown; generated?: boolean }) {
  const { me, dog } = await dogInMyFamily(user, body.dogId);
  if (me.role === "limited") throw new HttpError(403, "Менять внешность может владелец или участник");
  const look = validLook(body.look);
  must(
    await db
      .from("dogs")
      .update({
        character_look: look,
        character_status: "ready",
        character_attempts: body.generated ? (dog.character_attempts ?? 0) + 1 : dog.character_attempts,
      })
      .eq("id", dog.id),
  );
}

async function equip(user: TgUser, body: { dogId?: string; item?: string | null }, state: Awaited<ReturnType<typeof loadState>>) {
  await dogInMyFamily(user, body.dogId);
  const item = body.item ?? null;
  if (item !== null) {
    const dog = state.dogs.find((d) => d.id === body.dogId);
    if (!dog?.unlocked.includes(item)) throw new HttpError(403, "Эта вещь ещё не открыта");
  }
  must(await db.from("dogs").update({ equipped_item: item }).eq("id", body.dogId!));
}

/** Удаление собаки вместе с задачами, отметками и фото (ТЗ: «Предусмотрены удаление собаки»). */
async function deleteDog(user: TgUser, body: { dogId?: string }) {
  const { me, dog } = await dogInMyFamily(user, body.dogId);
  if (me.role !== "owner") throw new HttpError(403, "Удалить собаку может только владелец семьи");
  if (dog.photo_paths?.length) await db.storage.from(BUCKET).remove(dog.photo_paths);
  must(await db.from("dogs").delete().eq("id", dog.id));
}

/* ---------------- Действия ---------------- */

const STARTER_TASKS = [
  { title: "Покормить", category: "feed", time: "08:00" },
  { title: "Прогулка", category: "walk", time: "14:00" },
  { title: "Поиграть", category: "play", time: "19:00" },
];

async function createDog(user: TgUser, req: Request) {
  const form = await req.formData();
  const info = JSON.parse(String(form.get("data") ?? "{}"));
  const name = String(info.name ?? "").trim().slice(0, 40);
  const isMixed = Boolean(info.isMixed);
  const breed = isMixed ? null : String(info.breed ?? "").trim().slice(0, 60);
  if (!name) throw new HttpError(400, "Укажите кличку");
  if (!isMixed && !breed) throw new HttpError(400, "Укажите породу или выберите «Метис»");

  const photos = form.getAll("photos").filter((f): f is File => f instanceof File).slice(0, MAX_PHOTOS);
  for (const p of photos) {
    if (!p.type.startsWith("image/")) throw new HttpError(400, "Можно загружать только фото");
    if (p.size > MAX_PHOTO_BYTES) throw new HttpError(400, "Фото слишком большое (больше 5 МБ)");
  }

  // Первая собака создаёт семью, а пользователь становится её владельцем.
  let me = await myMember(user);
  if (!me) {
    const family = must(
      await db
        .from("families")
        .insert({ name: `Семья ${user.first_name}`.slice(0, 60), timezone: validTimezone(info.timezone) })
        .select("id")
        .single(),
    );
    me = must(
      await db
        .from("members")
        .insert({ family_id: family.id, telegram_id: user.id, name: user.first_name.slice(0, 40), role: "owner", color: COLORS[0] })
        .select("id, family_id, name, role, color")
        .single(),
    );
  }
  if (me.role === "limited") throw new HttpError(403, "Добавлять собак может владелец или участник семьи");

  const num = (v: unknown, max: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 && n <= max ? Math.round(n * 10) / 10 : null;
  };
  const dog = must(
    await db
      .from("dogs")
      .insert({
        family_id: me.family_id,
        name,
        breed,
        is_mixed: isMixed,
        age_years: num(info.ageYears, 30),
        weight_kg: num(info.weightKg, 120),
        sex: info.sex === "male" || info.sex === "female" ? info.sex : null,
        notes: info.notes ? String(info.notes).slice(0, 500) : null,
      })
      .select("id")
      .single(),
  );

  const paths: string[] = [];
  for (const [i, p] of photos.entries()) {
    const path = `${me.family_id}/${dog.id}/${i}-${crypto.randomUUID()}.jpg`;
    must(await db.storage.from(BUCKET).upload(path, p, { contentType: p.type, upsert: false }));
    paths.push(path);
  }
  if (paths.length) must(await db.from("dogs").update({ photo_paths: paths }).eq("id", dog.id));

  if (info.starterTasks) {
    must(await db.from("tasks").insert(STARTER_TASKS.map((t) => ({ ...t, dog_id: dog.id, assignee_id: me!.id }))));
  }
  return { createdDogId: dog.id };
}

/** Находит задачу и проверяет, что она принадлежит семье пользователя. */
async function taskInMyFamily(user: TgUser, taskId: unknown) {
  const me = await myMember(user);
  if (!me || typeof taskId !== "string") throw new HttpError(404, "Задача не найдена");
  const task = must(await db.from("tasks").select("id, dog_id, dogs!inner(family_id)").eq("id", taskId).maybeSingle());
  // deno-lint-ignore no-explicit-any
  if (!task || (task as any).dogs.family_id !== me.family_id) throw new HttpError(404, "Задача не найдена");
  const family = must(await db.from("families").select("timezone").eq("id", me.family_id).single());
  return { me, today: todayIn(family.timezone) };
}

async function complete(user: TgUser, body: { taskId?: string }) {
  const { me, today } = await taskInMyFamily(user, body.taskId);
  // Повторное нажатие или одновременная отметка двух людей ничего не дублируют.
  must(
    await db
      .from("completions")
      .upsert({ task_id: body.taskId, date: today, member_id: me.id, by_name: me.name }, { onConflict: "task_id,date", ignoreDuplicates: true }),
  );
}

async function undo(user: TgUser, body: { taskId?: string }) {
  const { today } = await taskInMyFamily(user, body.taskId);
  must(await db.from("completions").delete().eq("task_id", body.taskId!).eq("date", today));
}

/* ---------------- Маршруты ---------------- */

Deno.serve(async (req) => {
  const headers = cors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });

  try {
    const auth = req.headers.get("authorization") ?? "";
    const user = auth.startsWith("tma ") ? await verifyInitData(auth.slice(4)) : null;
    if (!user) throw new HttpError(401, "Откройте приложение заново из Telegram");

    const route = new URL(req.url).pathname.split("/").pop();
    if (route === "session") return json(await loadState(user));
    if (req.method !== "POST") throw new HttpError(405, "Метод не поддерживается");

    if (route === "dogs") {
      const { createdDogId } = await createDog(user, req);
      return json({ ...(await loadState(user)), createdDogId });
    }
    const body = await req.json().catch(() => ({}));
    if (route === "complete") await complete(user, body);
    else if (route === "undo") await undo(user, body);
    else if (route === "character") await saveLook(user, body);
    else if (route === "equip") await equip(user, body, await loadState(user));
    else if (route === "delete") await deleteDog(user, body);
    else throw new HttpError(404, "Неизвестный адрес");
    return json(await loadState(user));
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error(e);
    return json({ error: e instanceof HttpError && status < 500 ? e.message : "Ошибка сервера, попробуйте ещё раз" }, status);
  }
});
