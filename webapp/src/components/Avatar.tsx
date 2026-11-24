import type { Member } from "../rules";

/** Кружок с первой буквой имени. Позже — фото из Telegram. */
export function Avatar({ member, size = 28 }: { member: Pick<Member, "name" | "color">; size?: number }) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: member.color, fontSize: size * 0.44 }}
      aria-hidden="true"
    >
      {member.name.slice(0, 1)}
    </span>
  );
}
