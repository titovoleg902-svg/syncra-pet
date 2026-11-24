import type { ReactNode } from "react";

const eyes = <path d="M9 10h.01M15 10h.01" strokeWidth={2.6} />;

const PATHS = {
  check: <path d="M5 12.5l4.2 4.2L19 7" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.8v4.7M12 16.2h.01" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.6" />
      <path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3.2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  tasks: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.2" />
      <path d="M8 12.2l2.8 2.8L16 9.5" />
    </>
  ),
  mapPin: (
    <>
      <path d="M12 21s-7-6.2-7-11.4a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.6" r="2.5" />
    </>
  ),
  flame: <path d="M12 3c1 3.6 5.2 5.6 5.2 10.2a5.2 5.2 0 0 1-10.4 0c0-2.5 1.3-4 2.6-5.1.3 1.6 1 2.6 2.1 3.1.5-3.1-.2-5.6.5-8.2z" />,
  bowl: (
    <>
      <path d="M3 11.5h18l-1.5 5a3 3 0 0 1-2.9 2.2H7.4a3 3 0 0 1-2.9-2.2z" />
      <path d="M7 11.5c.6-2.4 2.6-3.9 5-3.9s4.4 1.5 5 3.9" />
    </>
  ),
  ball: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M5.2 7c3 1.6 4.6 5.2 4 10.6M18.8 17c-3-1.6-4.6-5.2-4-10.6" />
    </>
  ),
  heart: <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" />,
  star: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z" />,
  gift: (
    <>
      <rect x="4" y="11" width="16" height="9.5" rx="2" />
      <path d="M3 8h18v3H3zM12 8v12.5" />
      <path d="M12 8c-1.4-2.8-5-3.4-5-1.4S10 8 12 8zm0 0c1.4-2.8 5-3.4 5-1.4S14 8 12 8z" />
    </>
  ),
  moodCalm: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      {eyes}
      <path d="M9 15h6" />
    </>
  ),
  moodHappy: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      {eyes}
      <path d="M8.5 14a4 4 0 0 0 7 0" />
    </>
  ),
  moodBored: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      {eyes}
      <path d="M9 16.2a4 4 0 0 1 6 0" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z" />
      <circle cx="12" cy="12.8" r="3.6" />
    </>
  ),
  shield:<path d="M12 3.5l7 2.6v5.2c0 4.5-3 7.8-7 9.2-4-1.4-7-4.7-7-9.2V6.1z" />,
} satisfies Record<string, ReactNode>;

/** Лапка — заливкой, а не контуром. */
const Paw = () => (
  <g fill="currentColor" stroke="none">
    <ellipse cx="6.3" cy="10.2" rx="1.9" ry="2.3" />
    <ellipse cx="9.6" cy="6.4" rx="2" ry="2.4" />
    <ellipse cx="14.4" cy="6.4" rx="2" ry="2.4" />
    <ellipse cx="17.7" cy="10.2" rx="1.9" ry="2.3" />
    <path d="M12 11.6c-2.6 0-5.4 3-5.4 5.4 0 1.8 1.4 2.6 3 2.4 1-.1 1.6-.5 2.4-.5s1.4.4 2.4.5c1.6.2 3-.6 3-2.4 0-2.4-2.8-5.4-5.4-5.4z" />
  </g>
);

export type IconName = keyof typeof PATHS | "paw";

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="icon"
    >
      {name === "paw" ? <Paw /> : PATHS[name]}
    </svg>
  );
}
