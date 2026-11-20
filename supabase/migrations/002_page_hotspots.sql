-- NFC POINT: интерактивные зоны (hotspots). Безопасно: ничего не удаляет, можно запускать повторно.
-- Старая таблица page_buttons остаётся нетронутой (данные сохраняются), приложение её больше не использует.

create table if not exists public.page_hotspots (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.business_pages(id) on delete cascade,
  hotspot_key uuid not null,                       -- стабильный id зоны между черновиком и публикацией (его пишет аналитика)
  version text not null default 'draft',           -- 'draft' | 'published'
  name text not null default '',                   -- название только для админки
  url text not null default '',
  x numeric not null,                              -- % от ширины изображения
  y numeric not null,                              -- % от высоты изображения
  w numeric not null,
  h numeric not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint page_hotspots_version_chk check (version in ('draft', 'published')),
  constraint page_hotspots_bounds_chk check (x >= 0 and y >= 0 and w > 0 and h > 0 and x + w <= 100.001 and y + h <= 100.001)
);

create index if not exists page_hotspots_page_version_idx on public.page_hotspots(page_id, version);
create unique index if not exists page_hotspots_key_version_uidx on public.page_hotspots(page_id, version, hotspot_key);

-- Доступ только через сервер (secret key), как и остальные таблицы.
alter table public.page_hotspots enable row level security;
