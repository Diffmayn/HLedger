create extension if not exists "pgcrypto";

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  message text not null,
  emojis text,
  photo_data_url text,
  video_data_url text,
  video_mime_type text,
  video_duration integer default 0,
  video_thumbnail_data_url text,
  timestamp bigint not null
);

create table if not exists public.booth_photos (
  id uuid primary key default gen_random_uuid(),
  photo_data_url text not null,
  caption text,
  filters_used text[] default '{}',
  is_strip boolean default false,
  timestamp bigint not null
);

create table if not exists public.booth_videos (
  id uuid primary key default gen_random_uuid(),
  video_data_url text not null,
  video_mime_type text,
  video_duration integer default 0,
  video_thumbnail_data_url text,
  source text,
  filters_used text[] default '{}',
  timestamp bigint not null
);

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  entry_type text not null,
  entry_id text not null,
  emoji text not null,
  timestamp bigint not null
);

create table if not exists public.speech (
  id text primary key,
  title text,
  body text,
  author text,
  updated_at bigint not null
);

create table if not exists public.settings (
  key text primary key,
  value_json jsonb,
  updated_at bigint not null
);

alter table public.messages enable row level security;
alter table public.booth_photos enable row level security;
alter table public.booth_videos enable row level security;
alter table public.reactions enable row level security;
alter table public.speech enable row level security;
alter table public.settings enable row level security;

drop policy if exists "Public can read messages" on public.messages;
create policy "Public can read messages"
  on public.messages
  for select
  using (true);

drop policy if exists "Public can insert messages" on public.messages;
create policy "Public can insert messages"
  on public.messages
  for insert
  with check (true);

drop policy if exists "Public can delete messages" on public.messages;
create policy "Public can delete messages"
  on public.messages
  for delete
  using (true);

drop policy if exists "Public can read booth photos" on public.booth_photos;
create policy "Public can read booth photos"
  on public.booth_photos
  for select
  using (true);

drop policy if exists "Public can insert booth photos" on public.booth_photos;
create policy "Public can insert booth photos"
  on public.booth_photos
  for insert
  with check (true);

drop policy if exists "Public can delete booth photos" on public.booth_photos;
create policy "Public can delete booth photos"
  on public.booth_photos
  for delete
  using (true);

drop policy if exists "Public can read booth videos" on public.booth_videos;
create policy "Public can read booth videos"
  on public.booth_videos
  for select
  using (true);

drop policy if exists "Public can insert booth videos" on public.booth_videos;
create policy "Public can insert booth videos"
  on public.booth_videos
  for insert
  with check (true);

drop policy if exists "Public can delete booth videos" on public.booth_videos;
create policy "Public can delete booth videos"
  on public.booth_videos
  for delete
  using (true);

drop policy if exists "Public can read reactions" on public.reactions;
create policy "Public can read reactions"
  on public.reactions
  for select
  using (true);

drop policy if exists "Public can insert reactions" on public.reactions;
create policy "Public can insert reactions"
  on public.reactions
  for insert
  with check (true);

drop policy if exists "Public can delete reactions" on public.reactions;
create policy "Public can delete reactions"
  on public.reactions
  for delete
  using (true);

drop policy if exists "Public can read speech" on public.speech;
create policy "Public can read speech"
  on public.speech
  for select
  using (true);

drop policy if exists "Public can upsert speech" on public.speech;
create policy "Public can upsert speech"
  on public.speech
  for insert
  with check (true);

drop policy if exists "Public can update speech" on public.speech;
create policy "Public can update speech"
  on public.speech
  for update
  using (true)
  with check (true);

drop policy if exists "Public can read settings" on public.settings;
create policy "Public can read settings"
  on public.settings
  for select
  using (true);

drop policy if exists "Public can upsert settings" on public.settings;
create policy "Public can upsert settings"
  on public.settings
  for insert
  with check (true);

drop policy if exists "Public can update settings" on public.settings;
create policy "Public can update settings"
  on public.settings
  for update
  using (true)
  with check (true);
