-- Мультяшный двойник и кастомизация (ТЗ стр. 3, 12, 14).
--   none       — персонажа нет
--   generating — рисуем основную картинку по фото
--   preview    — готов предпросмотр: «Сохранить» или «Повторить»
--   moods      — рисуем эмоции «радуется» и «скучает» после сохранения
--   ready      — персонаж готов
--   failed     — ошибка; попытка не списывается
alter table dogs
  add column if not exists character_status text not null default 'none'
    check (character_status in ('none', 'generating', 'preview', 'moods', 'ready', 'failed')),
  add column if not exists character_attempts int not null default 0,
  add column if not exists character_preview_path text,
  add column if not exists character_paths jsonb not null default '{}'::jsonb, -- {"calm": "...", "happy": "...", "bored": "..."}
  add column if not exists character_error text,
  add column if not exists character_started_at timestamptz,
  add column if not exists equipped_item text;

grant select, insert, update, delete on dogs to service_role;
