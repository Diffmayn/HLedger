-- HLedger v2 schema: multi-event guestbook, media in Storage, host-only writes beyond insert.
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.entry_kind as enum ('message', 'photo', 'strip', 'video');
create type public.entry_status as enum ('published', 'hidden', 'pending');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  title       text not null,
  subtitle    text,
  theme       jsonb not null default '{"preset":"classic-warm"}'::jsonb,
  settings    jsonb not null default '{"moderation":false,"maxVideoSeconds":30,"allowedKinds":["message","photo","strip","video"],"language":"en"}'::jsonb,
  starts_at   timestamptz,
  ends_at     timestamptz,
  owner       uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table public.entries (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events (id) on delete cascade,
  kind          public.entry_kind not null,
  author_name   text not null default '' check (char_length(author_name) <= 80),
  body          text not null default '' check (char_length(body) <= 2000),
  emojis        text not null default '' check (char_length(emojis) <= 64),
  media_path    text,
  thumb_path    text,
  mime          text,
  width         integer,
  height        integer,
  duration_ms   integer not null default 0 check (duration_ms >= 0),
  filters_used  text[] not null default '{}',
  status        public.entry_status not null default 'published',
  client_id     text not null,
  created_at    timestamptz not null default now(),
  constraint entries_media_required check (kind = 'message' or media_path is not null)
);
create index entries_event_created_idx on public.entries (event_id, created_at desc);
create index entries_event_status_idx on public.entries (event_id, status);

create table public.reactions (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  entry_id    uuid not null references public.entries (id) on delete cascade,
  emoji       text not null check (char_length(emoji) <= 16),
  client_id   text not null,
  created_at  timestamptz not null default now(),
  unique (entry_id, client_id, emoji)
);
create index reactions_event_idx on public.reactions (event_id);
create index reactions_entry_idx on public.reactions (entry_id);

create table public.speech (
  event_id    uuid primary key references public.events (id) on delete cascade,
  title       text not null default '',
  body        text not null default '',
  author      text not null default '',
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_event_owner(p_event_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.events e where e.id = p_event_id and e.owner = auth.uid());
$$;

-- Pending when the event has moderation on; otherwise published.
create or replace function public.entries_apply_moderation()
returns trigger language plpgsql security definer set search_path = public as $$
declare moderation boolean;
begin
  select coalesce((e.settings ->> 'moderation')::boolean, false) into moderation
    from public.events e where e.id = new.event_id;
  if not public.is_event_owner(new.event_id) then
    new.status := case when moderation then 'pending' else 'published' end;
  end if;
  return new;
end;
$$;
create trigger entries_apply_moderation before insert on public.entries
  for each row execute function public.entries_apply_moderation();

-- Simple per-client rate limit: one entry per 10 s per client per event.
create or replace function public.entries_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_event_owner(new.event_id) then return new; end if;
  if exists (
    select 1 from public.entries x
    where x.event_id = new.event_id and x.client_id = new.client_id
      and x.created_at > now() - interval '10 seconds'
  ) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger entries_rate_limit before insert on public.entries
  for each row execute function public.entries_rate_limit();

-- Media files are removed by the host client through the Storage API (hosted
-- Supabase blocks direct deletes from storage.objects).

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.events    enable row level security;
alter table public.entries   enable row level security;
alter table public.reactions enable row level security;
alter table public.speech    enable row level security;

-- events: anyone can read; only the owner writes.
create policy events_select on public.events for select using (true);
create policy events_insert on public.events for insert with check (auth.uid() = owner);
create policy events_update on public.events for update using (auth.uid() = owner) with check (auth.uid() = owner);
create policy events_delete on public.events for delete using (auth.uid() = owner);

-- entries: public reads published rows, owner reads all; anyone inserts; owner updates/deletes.
create policy entries_select on public.entries for select
  using (status = 'published' or public.is_event_owner(event_id));
create policy entries_insert on public.entries for insert with check (true);
create policy entries_update on public.entries for update
  using (public.is_event_owner(event_id)) with check (public.is_event_owner(event_id));
create policy entries_delete on public.entries for delete using (public.is_event_owner(event_id));

-- reactions: public read + insert; a client may remove its own; owner may remove any.
create policy reactions_select on public.reactions for select using (true);
create policy reactions_insert on public.reactions for insert with check (true);
create policy reactions_delete on public.reactions for delete
  using (public.is_event_owner(event_id) or client_id = current_setting('request.headers', true)::jsonb ->> 'x-client-id');

-- speech: public read, owner write.
create policy speech_select on public.speech for select using (true);
create policy speech_upsert on public.speech for insert with check (public.is_event_owner(event_id));
create policy speech_update on public.speech for update
  using (public.is_event_owner(event_id)) with check (public.is_event_owner(event_id));

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.entries, public.reactions, public.speech, public.events;
alter table public.entries replica identity full;
alter table public.reactions replica identity full;

-- ---------------------------------------------------------------------------
-- Storage: bucket "media", public read, anon insert only, path {event_id}/{entry_id}/...
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 62914560, array['image/jpeg','image/png','image/webp','video/webm','video/mp4','video/quicktime'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy media_public_read on storage.objects for select using (bucket_id = 'media');
create policy media_anon_insert on storage.objects for insert
  with check (bucket_id = 'media' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$');
create policy media_owner_delete on storage.objects for delete
  using (bucket_id = 'media' and public.is_event_owner(((storage.foldername(name))[1])::uuid));
