import { DEFAULT_LOOK, type DogLook, type EarType, type Pattern } from "./components/CartoonDog";

/**
 * «Генерация» двойника по фото — бесплатно и прямо на телефоне:
 *  1) из фото берём основные цвета шерсти (центр кадра, где обычно собака);
 *  2) по названию породы — форму ушей, длину шерсти и типичный рисунок;
 *  3) «Повторить» даёт другой вариант распределения цветов.
 */

interface BreedHint {
  earType: EarType;
  fluffy: boolean;
  pattern?: Pattern;
  /** Типичные цвета, если фото не помогло */
  colors?: Partial<DogLook>;
}

const BREEDS: [RegExp, BreedHint][] = [
  [/йорк|yorkshire|york/i, { earType: "pointy", fluffy: true, colors: { base: "#C99254", body: "#4B5663", light: "#E8C38C" } }],
  [/хаски|husky|маламут|лайк/i, { earType: "pointy", fluffy: true, pattern: "blaze", colors: { base: "#7A7F8C", body: "#7A7F8C", light: "#FFFFFF" } }],
  [/шпиц|померан|spitz|pomeran|самоед|samoyed/i, { earType: "pointy", fluffy: true }],
  [/корги|corgi/i, { earType: "pointy", fluffy: false, pattern: "blaze", colors: { base: "#D9893E", body: "#D9893E", light: "#FFFFFF" } }],
  [/овчар|shepherd|малинуа|malinois/i, { earType: "pointy", fluffy: false, colors: { base: "#B07A3E", body: "#2E2A2B", light: "#D6A462" } }],
  [/чихуа|chihua|той|toy|джек|jack|фокс|fox|терьер|terrier|шнауцер|schnauzer/i, { earType: "semi", fluffy: false }],
  [/бигл|beagle|гонч/i, { earType: "floppy", fluffy: false, pattern: "patch", colors: { base: "#FFFFFF", body: "#2E2A2B", light: "#FFFFFF", ear: "#B8743A", patternColor: "#B8743A" } }],
  [/лабрадор|labrador|ретривер|retriever|голден|golden/i, { earType: "floppy", fluffy: false }],
  [/такс|dachs/i, { earType: "floppy", fluffy: false }],
  [/спаниел|spaniel|кавалер|cavalier|пудел|poodle|мальтез|maltese|ши-?тцу|shih/i, { earType: "floppy", fluffy: true }],
  [/далмат|dalmat/i, { earType: "floppy", fluffy: false, pattern: "spots", colors: { base: "#FFFFFF", body: "#FFFFFF", light: "#FFFFFF", patternColor: "#2E2A2B" } }],
  [/мопс|pug|бульдог|bulldog|французск/i, { earType: "semi", fluffy: false }],
];

function hintFor(breed: string | null | undefined): BreedHint {
  if (breed) for (const [re, h] of BREEDS) if (re.test(breed)) return h;
  return { earType: "floppy", fluffy: false }; // метис и незнакомые породы
}

type RGB = [number, number, number];

const toHex = ([r, g, b]: RGB) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const lum = ([r, g, b]: RGB) => 0.299 * r + 0.587 * g + 0.114 * b;
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sat = ([r, g, b]: RGB) => (Math.max(r, g, b) - Math.min(r, g, b)) / 255;

/** Основные цвета центра фото: простая кластеризация (k-средних) на 4 группы. */
async function photoColors(url: string): Promise<RGB[] | null> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  try {
    await img.decode();
  } catch {
    return null;
  }
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  // Центральные 60% кадра — там обычно собака, а не пол и стены.
  const sw = img.naturalWidth * 0.6;
  const sh = img.naturalHeight * 0.6;
  ctx.drawImage(img, img.naturalWidth * 0.2, img.naturalHeight * 0.2, sw, sh, 0, 0, size, size);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, size, size).data;
  } catch {
    return null; // браузер не дал прочитать пиксели
  }
  const px: RGB[] = [];
  for (let i = 0; i < data.length; i += 4) px.push([data[i], data[i + 1], data[i + 2]]);

  let centers: RGB[] = [px[0], px[Math.floor(px.length / 3)], px[Math.floor((2 * px.length) / 3)], px[px.length - 1]];
  const counts = new Array(centers.length).fill(0);
  for (let iter = 0; iter < 8; iter++) {
    const sums = centers.map(() => [0, 0, 0, 0]);
    for (const p of px) {
      let best = 0;
      let bestD = Infinity;
      centers.forEach((c, k) => {
        const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
        if (d < bestD) {
          bestD = d;
          best = k;
        }
      });
      sums[best][0] += p[0];
      sums[best][1] += p[1];
      sums[best][2] += p[2];
      sums[best][3]++;
    }
    centers = sums.map((s, k) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : centers[k]));
    sums.forEach((s, k) => (counts[k] = s[3]));
  }
  // Самые частые цвета, без почти серого фона с низкой насыщенностью, если есть альтернатива.
  return centers
    .map((c, k) => ({ c, n: counts[k] }))
    .filter((x) => x.n > px.length * 0.05)
    .sort((a, b) => b.n - a.n)
    .map((x) => x.c);
}

/**
 * Строит внешность. variant 0 — основной вариант, 1 и 2 — «Повторить».
 */
export async function generateLook(photoUrl: string | null, breed: string | null | undefined, variant = 0): Promise<DogLook> {
  const hint = hintFor(breed);
  const look: DogLook = { ...DEFAULT_LOOK, ...hint.colors, earType: hint.earType, fluffy: hint.fluffy, pattern: hint.pattern ?? "none" };

  // Для пород с известным окрасом (йорк, бигль, хаски…) берём типичный окрас породы:
  // на фото собака часто занимает малую часть кадра, и цвета пола/стен его испортят.
  // Для метисов и незнакомых пород пробуем цвета с фото.
  const colors = photoUrl && !hint.colors?.base ? await photoColors(photoUrl) : null;
  if (colors && colors.length >= 2) {
    // Цвета собаки обычно насыщеннее пола/стен: сортируем по «окрашенности».
    const furry = [...colors].sort((a, b) => sat(b) - sat(a) || lum(b) - lum(a));
    const byLight = [...colors].sort((a, b) => lum(a) - lum(b));
    const dark = byLight[0];
    const light = byLight[byLight.length - 1];
    const main = variant === 1 ? byLight[Math.floor(byLight.length / 2)] : furry[0];
    look.base = toHex(main);
    look.body = toHex(variant === 2 ? dark : main);
    look.light = toHex(mix(main, light, 0.6));
    look.ear = toHex(mix(main, [0, 0, 0], 0.08));
  }
  if (variant === 1 && look.pattern === "none") look.pattern = "blaze";
  if (variant === 2) look.fluffy = !look.fluffy;
  return look;
}

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
