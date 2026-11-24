import { type Completion, FAMILY, type Task, taskStatus, type Category } from "../demo";
import { Avatar } from "./Avatar";
import { Icon, type IconName } from "./Icon";

const CATEGORY_ICON: Record<Category, IconName> = {
  feed: "bowl",
  walk: "paw",
  play: "ball",
  health: "heart",
  custom: "star",
};

const timeOf = (ms: number) =>
  new Date(ms).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

interface Props {
  tasks: Task[];
  done: Record<string, Completion>;
  now: Date;
  onToggle: (task: Task) => void;
}

export function TaskList({ tasks, done, now, onToggle }: Props) {
  const sorted = [...tasks].sort((a, b) => a.time.localeCompare(b.time));
  return (
    <ul className="tasks">
      {sorted.map((task) => {
        const c = done[task.id];
        const status = taskStatus(task, c, now);
        const assignee = FAMILY.find((m) => m.id === task.assigneeId)!;
        return (
          <li key={task.id} className={`task task--${status}`}>
            <span className="task__icon">
              <Icon name={CATEGORY_ICON[task.category]} size={22} />
            </span>
            <div className="task__body">
              <div className="task__title">
                <span className="task__time">{task.time}</span> · {task.title}
              </div>
              <div className="task__meta">
                <Avatar member={assignee} size={18} />
                <span>{assignee.name}</span>
                <span className={`status status--${status}`}>
                  {status === "done" && (
                    <>
                      <Icon name="check" size={13} />
                      {c.by === assignee.name ? `в ${timeOf(c.at)}` : `${c.by}, ${timeOf(c.at)}`}
                    </>
                  )}
                  {status === "ahead" && (
                    <>
                      <Icon name="clock" size={13} /> Впереди
                    </>
                  )}
                  {status === "overdue" && (
                    <>
                      <Icon name="alert" size={13} /> Просрочено
                    </>
                  )}
                </span>
              </div>
            </div>
            <button
              type="button"
              className={`check ${c ? "check--on" : ""}`}
              onClick={() => onToggle(task)}
              aria-pressed={!!c}
              aria-label={c ? `Отменить отметку: ${task.title}` : `Отметить выполненной: ${task.title}`}
            >
              <span className="check__box">{c && <Icon name="check" size={18} />}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
