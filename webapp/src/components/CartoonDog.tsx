import type { Mood } from "../rules";
import { Accessory, type ItemId } from "./Accessories";

/**
 * Векторный мультяшный пёс в пропорциях из ТЗ: большая яйцеобразная голова,
 * маленькое тело, короткие лапы, выразительные глаза.
 * Внешность задаётся параметрами (окрас, уши, рисунок), настроение меняет морду,
 * уши и хвост. Вещи рисуются в системе координат головы — сидят точно на месте.
 */

export type EarType = "pointy" | "floppy" | "semi";
export type Pattern = "none" | "patch" | "spots" | "blaze";

export interface DogLook {
  /** Голова и лапы */
  base: string;
  /** Тело и спина */
  body: string;
  /** Морда, грудь */
  light: string;
  ear: string;
  earType: EarType;
  pattern: Pattern;
  patternColor: string;
  /** Длинная шерсть: чёлка и пушистые щёки */
  fluffy: boolean;
  nose: string;
  eye: string;
}

export const DEFAULT_LOOK: DogLook = {
  base: "#C99254",
  body: "#4B5663",
  light: "#E8C38C",
  ear: "#BD8445",
  earType: "pointy",
  pattern: "none",
  patternColor: "#2E2A2B",
  fluffy: true,
  nose: "#231E21",
  eye: "#2B1D18",
};

interface Props {
  look: DogLook;
  mood: Mood;
  item?: ItemId | null;
  /** Моргание и виляние хвостом */
  animated?: boolean;
  className?: string;
}

export function CartoonDog({ look, mood, item, animated = true, className }: Props) {
  const happy = mood === "happy";
  const bored = mood === "bored";
  const headDrop = bored ? 5 : 0;
  const earTilt = bored ? 22 : happy ? -6 : 0;

  return (
    <svg viewBox="0 0 200 220" className={`cartoon-dog ${animated ? "is-animated" : ""} ${className ?? ""}`} role="img" aria-hidden="true">
      {/* ---------- Хвост (позади) ---------- */}
      <g className={`cd-tail ${happy ? "cd-tail--happy" : bored ? "cd-tail--low" : ""}`} style={{ transformOrigin: "136px 176px" }}>
        <path d="M134 178 C150 172 160 158 162 138" fill="none" stroke={look.body} strokeWidth="13" strokeLinecap="round" />
        {look.fluffy && <path d="M160 142 q8 -10 4 -20 q-6 6 -12 4 q4 8 8 16z" fill={look.body} />}
      </g>

      {/* ---------- Тело ---------- */}
      <ellipse cx="66" cy="196" rx="20" ry="14" fill={look.body} />
      <ellipse cx="134" cy="196" rx="20" ry="14" fill={look.body} />
      <path d="M62 196 C56 150 74 132 100 132 C126 132 144 150 138 196 Z" fill={look.body} />
      {look.pattern === "spots" && (
        <g fill={look.patternColor} opacity="0.85">
          <ellipse cx="78" cy="160" rx="7" ry="5" />
          <ellipse cx="126" cy="170" rx="6" ry="4.5" />
        </g>
      )}
      {/* Грудь */}
      <path d="M80 200 C78 168 88 146 100 146 C112 146 122 168 120 200 Z" fill={look.light} />

      {/* ---------- Передние лапы ---------- */}
      <rect x="79" y="172" width="16" height="32" rx="8" fill={look.base} />
      <rect x="105" y="172" width="16" height="32" rx="8" fill={look.base} />
      <ellipse cx="86" cy="205" rx="11" ry="7" fill={look.base} />
      <ellipse cx="114" cy="205" rx="11" ry="7" fill={look.base} />
      <path d="M82 207 v-4 M87 207 v-4 M110 207 v-4 M115 207 v-4" stroke="rgba(0,0,0,.18)" strokeWidth="1.4" strokeLinecap="round" />

      {/* ---------- Бандана на шее (под головой) ---------- */}
      {item === "bandana" && <Accessory id="bandana" x={64} y={122} width={72} />}

      {/* ---------- Голова ---------- */}
      <g className="cd-head" transform={`translate(0 ${headDrop})`} style={{ transformOrigin: "100px 120px" }}>
        <Ears look={look} tilt={earTilt} />

        {/* Форма головы — «яйцо», шире снизу */}
        <path d="M100 22 C140 22 164 50 164 84 C164 118 136 132 100 132 C64 132 36 118 36 84 C36 50 60 22 100 22 Z" fill={look.base} />

        {look.fluffy && (
          <g fill={look.base}>
            {/* Пушистые щёки */}
            <path d="M40 96 l-10 6 l10 2 l-8 8 l12 -2 l-2 8 l10 -8z" />
            <path d="M160 96 l10 6 l-10 2 l8 8 l-12 -2 l2 8 l-10 -8z" />
            {/* Чёлка-хохолок */}
            <path d="M78 30 q8 -20 22 -14 q12 -10 22 6 q-8 -2 -12 4 q-6 -8 -14 -2 q-8 -2 -18 6z" />
          </g>
        )}

        {/* Рисунок на голове */}
        {look.pattern === "patch" && <ellipse cx="78" cy="78" rx="20" ry="18" fill={look.patternColor} />}
        {look.pattern === "blaze" && <path d="M100 30 C108 52 108 70 104 92 L96 92 C92 70 92 52 100 30 Z" fill={look.light} />}
        {look.pattern === "spots" && (
          <g fill={look.patternColor} opacity="0.85">
            <ellipse cx="132" cy="56" rx="8" ry="6" />
            <ellipse cx="70" cy="60" rx="5" ry="4" />
          </g>
        )}

        {/* Щёчки */}
        <ellipse cx="66" cy="104" rx="11" ry="7" fill="#F29C9C" opacity={happy ? 0.45 : 0.18} />
        <ellipse cx="134" cy="104" rx="11" ry="7" fill="#F29C9C" opacity={happy ? 0.45 : 0.18} />

        {/* Морда */}
        <ellipse cx="100" cy="106" rx="27" ry="19" fill={look.light} />

        <Eyes look={look} mood={mood} />

        {/* Нос */}
        <path d="M90 95 Q100 90 110 95 Q109 104 100 106 Q91 104 90 95 Z" fill={look.nose} />
        <ellipse cx="96" cy="95" rx="3" ry="1.6" fill="#fff" opacity="0.55" />

        <Mouth mood={mood} />

        {/* Вещи на голове */}
        {item === "panama" && <Accessory id="panama" x={52} y={-4} width={96} />}
        {item === "party-hat" && <Accessory id="party-hat" x={108} y={-26} width={46} rotate={18} />}
      </g>
    </svg>
  );
}

function Ears({ look, tilt }: { look: DogLook; tilt: number }) {
  const inner = "#E9AE95";
  if (look.earType === "floppy") {
    return (
      <g transform={`translate(0 ${tilt > 0 ? 4 : 0})`}>
        <path d="M54 40 C30 44 20 72 26 104 C30 118 46 116 52 100 C58 84 62 60 54 40 Z" fill={look.ear} />
        <path d="M146 40 C170 44 180 72 174 104 C170 118 154 116 148 100 C142 84 138 60 146 40 Z" fill={look.ear} />
      </g>
    );
  }
  const semi = look.earType === "semi";
  // Левое ухо поворачивается вокруг своего основания: при «скучает» уши опускаются в стороны.
  return (
    <g>
      <g transform={`rotate(${-tilt} 62 46)`}>
        <path d={semi ? "M48 54 C46 34 52 16 66 10 C72 22 76 34 78 44 C70 38 62 40 58 46 Z" : "M46 56 C44 34 48 10 56 2 C68 14 80 30 84 42 Z"} fill={look.ear} />
        <path d={semi ? "M56 46 C56 34 60 24 66 18 C68 26 70 32 71 38 Z" : "M54 46 C53 32 56 18 60 12 C66 22 72 30 75 38 Z"} fill={inner} opacity="0.8" />
        {look.fluffy && <path d="M46 56 l-6 -4 l4 -4 l-6 -6 l6 -1" fill={look.ear} />}
      </g>
      <g transform={`rotate(${tilt} 138 46)`}>
        <path d={semi ? "M152 54 C154 34 148 16 134 10 C128 22 124 34 122 44 C130 38 138 40 142 46 Z" : "M154 56 C156 34 152 10 144 2 C132 14 120 30 116 42 Z"} fill={look.ear} />
        <path d={semi ? "M144 46 C144 34 140 24 134 18 C132 26 130 32 129 38 Z" : "M146 46 C147 32 144 18 140 12 C134 22 128 30 125 38 Z"} fill={inner} opacity="0.8" />
        {look.fluffy && <path d="M154 56 l6 -4 l-4 -4 l6 -6 l-6 -1" fill={look.ear} />}
      </g>
    </g>
  );
}

function Eyes({ look, mood }: { look: DogLook; mood: Mood }) {
  const eye = (cx: number) => (
    <g key={cx}>
      <ellipse cx={cx} cy="80" rx="9" ry="10.5" fill={look.eye} />
      <circle cx={cx - 3} cy="76" r="3.6" fill="#fff" />
      <circle cx={cx + 3.5} cy="84" r="1.6" fill="#fff" opacity="0.8" />
      {mood === "bored" && (
        // Полуопущенное веко — цвет головы
        <path d={`M${cx - 11} 70 L${cx + 11} 70 L${cx + 11} 80 Q${cx} 76 ${cx - 11} 80 Z`} fill={look.base} />
      )}
    </g>
  );
  return (
    <g className="cd-eyes" style={{ transformOrigin: "100px 80px" }}>
      {eye(78)}
      {eye(122)}
      {mood === "happy" && (
        // Приподнятые брови-дуги
        <g fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="2.2" strokeLinecap="round">
          <path d="M70 64 Q78 58 86 63" />
          <path d="M114 63 Q122 58 130 64" />
        </g>
      )}
      {mood === "bored" && (
        <g fill="none" stroke="rgba(0,0,0,.3)" strokeWidth="2.2" strokeLinecap="round">
          <path d="M69 66 Q78 68 87 64" />
          <path d="M113 64 Q122 68 131 66" />
        </g>
      )}
    </g>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  if (mood === "happy") {
    return (
      <g>
        <path d="M86 108 Q100 132 114 108 Q100 114 86 108 Z" fill="#5A2630" />
        <path d="M93 116 Q100 132 107 116 Q100 120 93 116 Z" fill="#F07C8C" />
      </g>
    );
  }
  if (mood === "bored") {
    return <path d="M91 115 Q100 110 109 115" fill="none" stroke="#3A2A2A" strokeWidth="2.4" strokeLinecap="round" />;
  }
  return <path d="M90 109 Q95 114 100 109 Q105 114 110 109" fill="none" stroke="#3A2A2A" strokeWidth="2.4" strokeLinecap="round" />;
}
