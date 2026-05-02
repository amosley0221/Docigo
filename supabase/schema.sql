-- Docigo schema. Run this once in your Supabase project's SQL editor
-- (Dashboard -> SQL -> New query -> paste -> Run).
--
-- Re-running is safe: every CREATE uses IF NOT EXISTS or ON CONFLICT,
-- and policies are dropped + recreated to keep them in sync with this file.

-- ---------- Tables ----------------------------------------------------------

create table if not exists public.locations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  kind        text not null,
  color       text not null,
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  name        text not null,
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  location_id  uuid not null references public.locations(id) on delete cascade,
  group_id     uuid not null references public.groups(id) on delete cascade,
  kind         text not null,
  name         text not null,
  -- File-only:
  mime         text,
  size         bigint,
  storage_path text,
  /* For file kinds that we can't preview directly (e.g. PowerPoint), the
     conversion service writes a sibling PDF and stores its path here.
     The viewer prefers the derived PDF when set. */
  derived_pdf_path text,
  -- Quote:
  quote_text   text,
  quote_source text,
  -- Checklist:
  checklist_entries jsonb,
  -- Chart:
  chart_type    text,
  chart_data    jsonb,
  chart_x_label text,
  chart_y_label text,
  -- Search index for files (extracted plain text):
  search_text   text,
  -- Per-group active item ordering:
  position      int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists groups_user_loc_pos_idx on public.groups (user_id, location_id, position);
create index if not exists items_user_group_idx    on public.items  (user_id, group_id, position);
create index if not exists items_search_fts_idx
  on public.items using gin (
    to_tsvector(
      'english',
      coalesce(name,'') || ' ' || coalesce(search_text,'') || ' ' || coalesce(quote_text,'')
    )
  );

-- ---------- Row level security ---------------------------------------------

alter table public.locations enable row level security;
alter table public.groups    enable row level security;
alter table public.items     enable row level security;

drop policy if exists "own_rows_select" on public.locations;
drop policy if exists "own_rows_modify" on public.locations;
drop policy if exists "own_rows_select" on public.groups;
drop policy if exists "own_rows_modify" on public.groups;
drop policy if exists "own_rows_select" on public.items;
drop policy if exists "own_rows_modify" on public.items;

create policy "own_rows_select" on public.locations
  for select using (user_id = auth.uid());
create policy "own_rows_modify" on public.locations
  for all    using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own_rows_select" on public.groups
  for select using (user_id = auth.uid());
create policy "own_rows_modify" on public.groups
  for all    using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own_rows_select" on public.items
  for select using (user_id = auth.uid());
create policy "own_rows_modify" on public.items
  for all    using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Storage --------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('files', 'files', false)
on conflict (id) do nothing;

drop policy if exists "files_own_read"   on storage.objects;
drop policy if exists "files_own_insert" on storage.objects;
drop policy if exists "files_own_update" on storage.objects;
drop policy if exists "files_own_delete" on storage.objects;

create policy "files_own_read" on storage.objects
  for select using (
    bucket_id = 'files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "files_own_insert" on storage.objects
  for insert with check (
    bucket_id = 'files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "files_own_update" on storage.objects
  for update using (
    bucket_id = 'files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "files_own_delete" on storage.objects
  for delete using (
    bucket_id = 'files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------- Migrations for older databases --------------------------------
-- Safe to run on a fresh schema (the create above already includes the
-- column); only does work on databases that pre-date the column being added.
alter table public.items
  add column if not exists derived_pdf_path text;
