-- Syncra PET: семья, участники, собаки, задачи, отметки выполнения.
-- Доступ к таблицам только у серверной функции (service role): RLS включён, политик нет.

create table if not exists families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  timezone    text not null default 'Europe/Moscow',      -- часовой пояс семьи (ТЗ: цель дня по нему)
  daily_goal  int  not null default 3 check (daily_goal between 1 and 5),
  created_at  timestamptz not null default now()
);

create table if not exists members (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references families(id) on delete cascade,
  telegram_id  bigint not null,
  name         text not null,
  role         text not null check (role in ('owner', 'member', 'limited')),
  color        text not null,
  created_at   timestamptz not null default now(),
  unique (family_id, telegram_id)
);
create index if not exists members_telegram_idx on members (telegram_id);

create table if not exists dogs (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references families(id) on delete cascade,
  name         text not null check (length(trim(name)) > 0),
  breed        text,
  is_mixed     boolean not null default false,
  birth_date   date,
  age_years    numeric(4,1),
  weight_kg    numeric(5,1),
  sex          text check (sex in ('male', 'female')),
  notes        text,
  photo_paths  text[] not null default '{}',
  created_at   timestamptz not null default now(),
  -- ТЗ: обязательны кличка и порода или «метис»
  check (is_mixed or length(trim(coalesce(breed, ''))) > 0)
);
create index if not exists dogs_family_idx on dogs (family_id);

create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  dog_id       uuid not null references dogs(id) on delete cascade,
  title        text not null,
  category     text not null check (category in ('feed', 'walk', 'play', 'health', 'custom')),
  time         text not null check (time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  assignee_id  uuid references members(id) on delete set null,
  repeat       text not null default 'daily',
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists tasks_dog_idx on tasks (dog_id);

-- Одна задача — одна отметка в день: одновременные нажатия двух людей дают одно выполнение (ТЗ).
create table if not exists completions (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(id) on delete cascade,
  date       date not null,
  member_id  uuid references members(id) on delete set null,
  by_name    text not null,
  done_at    timestamptz not null default now(),
  unique (task_id, date)
);
create index if not exists completions_date_idx on completions (date);

alter table families    enable row level security;
alter table members     enable row level security;
alter table dogs        enable row level security;
alter table tasks       enable row level security;
alter table completions enable row level security;

-- Закрытое хранилище фото: доступ только по временным подписанным ссылкам.
insert into storage.buckets (id, name, public)
values ('dog-photos', 'dog-photos', false)
on conflict (id) do nothing;
