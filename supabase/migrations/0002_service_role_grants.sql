-- Новые проекты Supabase не выдают права на таблицы автоматически.
-- Доступ нужен только серверной функции (service_role); anon/authenticated остаются без доступа.
grant usage on schema public to service_role;
grant select, insert, update, delete on families, members, dogs, tasks, completions to service_role;
