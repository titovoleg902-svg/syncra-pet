/**
 * Вещи для персонажа (стартовый набор ТЗ: 3 аксессуара).
 * Каждая вещь — отдельный SVG со своей системой координат; на векторном псе
 * она вкладывается в голову, на картинке Бони — накладывается поверх.
 */

export type ItemId = "panama" | "bandana" | "party-hat";

export const ITEMS: { id: ItemId; name: string; condition: string }[] = [
  { id: "panama", name: "Панама", condition: "За 10 очков" },
  { id: "bandana", name: "Бандана", condition: "3 дня серии" },
  { id: "party-hat", name: "Колпак", condition: "Пригласить близкого" },
];

const LAV = "#B4A4D9";
const LAV_D = "#8E7BC4";

/** Пропорции (ширина/высота) каждой вещи — для вложения в SVG и для иконок. */
const VIEW: Record<ItemId, { w: number; h: number }> = {
  panama: { w: 100, h: 56 },
  bandana: { w: 100, h: 60 },
  "party-hat": { w: 50, h: 72 },
};

function Paw({ x, y, s = 1, fill = "#fff" }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill}>
      <ellipse cx="0" cy="2.5" rx="3.2" ry="2.6" />
      <circle cx="-3.4" cy="-1.6" r="1.3" />
      <circle cx="-1.2" cy="-3.4" r="1.3" />
      <circle cx="1.2" cy="-3.4" r="1.3" />
      <circle cx="3.4" cy="-1.6" r="1.3" />
    </g>
  );
}

function Art({ id }: { id: ItemId }) {
  if (id === "panama") {
    return (
      <g>
        <ellipse cx="50" cy="44" rx="48" ry="10" fill={LAV_D} />
        <path d="M18 44 C18 16 30 4 50 4 C70 4 82 16 82 44 Z" fill={LAV} />
        <path d="M18 40 Q50 48 82 40 L82 44 Q50 52 18 44 Z" fill={LAV_D} opacity="0.7" />
        <ellipse cx="50" cy="42" rx="44" ry="7" fill={LAV} />
        <Paw x={50} y={22} s={1.6} />
        <ellipse cx="38" cy="14" rx="8" ry="4" fill="#fff" opacity="0.25" />
      </g>
    );
  }
  if (id === "bandana") {
    return (
      <g>
        <path d="M4 6 Q50 18 96 6 L92 16 Q72 24 50 58 Q28 24 8 16 Z" fill={LAV} />
        <path d="M4 6 Q50 18 96 6 L95 11 Q50 23 5 11 Z" fill={LAV_D} />
        <Paw x={50} y={34} s={1.4} />
        <Paw x={34} y={24} s={0.9} />
        <Paw x={66} y={24} s={0.9} />
        <circle cx="96" cy="8" r="4" fill={LAV_D} />
      </g>
    );
  }
  return (
    <g>
      <path d="M25 4 L46 66 Q25 72 4 66 Z" fill="#F3B7C7" />
      <path d="M25 4 L46 66 Q25 72 4 66 Z" fill="none" stroke="#E48FA8" strokeWidth="1.5" />
      <path d="M14 36 Q26 40 36 36 M9 52 Q25 58 41 52" fill="none" stroke={LAV} strokeWidth="5" strokeLinecap="round" />
      <circle cx="20" cy="26" r="2.4" fill="#fff" />
      <circle cx="30" cy="46" r="2.4" fill="#fff" />
      <circle cx="18" cy="60" r="2.4" fill="#fff" />
      <circle cx="25" cy="5" r="6" fill="#FCE38A" />
      <path d="M4 66 Q25 74 46 66" fill="none" stroke="#E48FA8" strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

/** Вещь внутри другого SVG: x, y — левый верхний угол, width — ширина. */
export function Accessory({ id, x, y, width, rotate = 0 }: { id: ItemId; x: number; y: number; width: number; rotate?: number }) {
  const v = VIEW[id];
  const height = (width * v.h) / v.w;
  return (
    <svg x={x} y={y} width={width} height={height} viewBox={`0 0 ${v.w} ${v.h}`} overflow="visible">
      <g transform={rotate ? `rotate(${rotate} ${v.w / 2} ${v.h})` : undefined}>
        <Art id={id} />
      </g>
    </svg>
  );
}

/** Вещь как самостоятельная картинка (иконки в сетке, наложение на Боню). */
export function ItemIcon({ id, className, style }: { id: ItemId; className?: string; style?: React.CSSProperties }) {
  const v = VIEW[id];
  return (
    <svg viewBox={`-4 -6 ${v.w + 8} ${v.h + 12}`} className={className} style={style} aria-hidden="true">
      <Art id={id} />
    </svg>
  );
}
