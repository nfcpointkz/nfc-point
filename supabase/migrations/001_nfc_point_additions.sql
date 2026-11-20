-- NFC POINT: безопасная миграция. Можно запускать повторно: ничего не удаляет и не пересоздаёт.
-- Запускать в Supabase -> SQL Editor.
-- Структура ваших существующих таблиц мне недоступна, поэтому здесь только "добавить, если нет".

-- ---------- businesses ----------
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
alter table public.businesses add column if not exists slug text;
alter table public.businesses add column if not exists category text;
alter table public.businesses add column if not exists is_active boolean not null default true;
alter table public.businesses add column if not exists updated_at timestamptz not null default now();

-- ---------- business_pages ----------
create table if not exists public.business_pages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.business_pages add column if not exists draft_image_url text;
alter table public.business_pages add column if not exists draft_image_width integer;
alter table public.business_pages add column if not exists draft_image_height integer;
alter table public.business_pages add column if not exists published_image_url text;
alter table public.business_pages add column if not exists published_image_width integer;
alter table public.business_pages add column if not exists published_image_height integer;
alter table public.business_pages add column if not exists published_at timestamptz;
alter table public.business_pages add column if not exists updated_at timestamptz not null default now();
create unique index if not exists business_pages_business_uidx on public.business_pages(business_id);

-- ---------- page_buttons ----------
create table if not exists public.page_buttons (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.business_pages(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.page_buttons add column if not exists version text not null default 'draft'; -- 'draft' | 'published'
alter table public.page_buttons add column if not exists button_key text;   -- стабильный id кнопки между версиями
alter table public.page_buttons add column if not exists type text not null default 'custom';
alter table public.page_buttons add column if not exists label text not null default '';
alter table public.page_buttons add column if not exists url text not null default '';
alter table public.page_buttons add column if not exists x numeric not null default 10;      -- % от ширины изображения
alter table public.page_buttons add column if not exists y numeric not null default 10;      -- % от высоты изображения
alter table public.page_buttons add column if not exists w numeric not null default 30;
alter table public.page_buttons add column if not exists h numeric not null default 6;
alter table public.page_buttons add column if not exists bg_color text not null default '#111111';
alter table public.page_buttons add column if not exists text_color text not null default '#ffffff';
alter table public.page_buttons add column if not exists style text not null default 'solid'; -- solid | outline | ghost | glass
alter table public.page_buttons add column if not exists radius numeric not null default 14;
alter table public.page_buttons add column if not exists show_icon boolean not null default true;
alter table public.page_buttons add column if not exists show_label boolean not null default true;
alter table public.page_buttons add column if not exists sort_order integer not null default 0;
alter table public.page_buttons add column if not exists is_enabled boolean not null default true;
create index if not exists page_buttons_page_version_idx on public.page_buttons(page_id, version);

-- ---------- nfc_cards ----------
create table if not exists public.nfc_cards (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.nfc_cards add column if not exists token text;
alter table public.nfc_cards add column if not exists label text;
alter table public.nfc_cards add column if not exists is_active boolean not null default true;
create unique index if not exists nfc_cards_token_uidx on public.nfc_cards(token);

-- ---------- analytics_events ----------
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
alter table public.analytics_events add column if not exists event_type text;      -- page_view | button_click
alter table public.analytics_events add column if not exists business_id uuid references public.businesses(id) on delete cascade;
alter table public.analytics_events add column if not exists card_id uuid references public.nfc_cards(id) on delete set null;
alter table public.analytics_events add column if not exists button_key text;
alter table public.analytics_events add column if not exists button_label text;
alter table public.analytics_events add column if not exists visitor_id text;      -- случайный id браузера, не IP
create index if not exists analytics_events_created_idx on public.analytics_events(created_at desc);
create index if not exists analytics_events_business_idx on public.analytics_events(business_id, created_at desc);
create index if not exists analytics_events_card_idx on public.analytics_events(card_id);

-- ---------- RLS ----------
-- Все операции приложения идут через сервер с проверкой администратора,
-- публичные чтения/запись аналитики — только через серверный API (secret key).
-- Поэтому для anon-ключа никаких открытых политик не нужно.
alter table public.businesses enable row level security;
alter table public.business_pages enable row level security;
alter table public.page_buttons enable row level security;
alter table public.nfc_cards enable row level security;
alter table public.analytics_events enable row level security;

-- ---------- Storage ----------
-- Публичный бакет для изображений страниц (загрузка идёт только с сервера).
insert into storage.buckets (id, name, public)
values ('page-images', 'page-images', true)
on conflict (id) do nothing;

-- ---------- Проверка: что лежит в ваших таблицах ----------
-- select table_name, column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public'
-- order by table_name, ordinal_position;
