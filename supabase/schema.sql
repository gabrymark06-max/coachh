-- Tempra: one row of app state per user and a private bucket for progress photos.
-- Run once in the Supabase SQL editor. Each user can read and write only their own data.

create table if not exists public.app_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  revision integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "own state: select" on public.app_state;
drop policy if exists "own state: insert" on public.app_state;
drop policy if exists "own state: update" on public.app_state;
drop policy if exists "own state: delete" on public.app_state;
create policy "own state: select" on public.app_state for select to authenticated using ((select auth.uid()) = user_id);
create policy "own state: insert" on public.app_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own state: update" on public.app_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own state: delete" on public.app_state for delete to authenticated using ((select auth.uid()) = user_id);

-- Progress photos: private bucket, files stored under <user id>/<photo key>.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "own photos: select" on storage.objects;
drop policy if exists "own photos: insert" on storage.objects;
drop policy if exists "own photos: update" on storage.objects;
drop policy if exists "own photos: delete" on storage.objects;
create policy "own photos: select" on storage.objects for select to authenticated using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own photos: insert" on storage.objects for insert to authenticated with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own photos: update" on storage.objects for update to authenticated using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own photos: delete" on storage.objects for delete to authenticated using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Tempra: shared barcode products. When a product is missing from Open Food Facts, a signed-in user reads its label
-- and the values are saved here, so the next scan of that barcode finds it for everyone.
-- Anyone can read; signed-in users can add products and correct only the ones they added.
create table if not exists public.products (
  code text primary key check (code ~ '^[0-9]{8,14}$'),
  name text not null check (char_length(name) between 1 and 120),
  brand text check (char_length(brand) <= 80),
  kcal numeric not null check (kcal between 0 and 950),
  p numeric not null check (p between 0 and 100),
  c numeric not null check (c between 0 and 100),
  f numeric not null check (f between 0 and 100),
  serving numeric check (serving > 0 and serving < 2000),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists "products: read" on public.products;
drop policy if exists "products: add" on public.products;
drop policy if exists "products: fix own" on public.products;
create policy "products: read" on public.products for select to anon, authenticated using (true);
create policy "products: add" on public.products for insert to authenticated with check ((select auth.uid()) = created_by);
create policy "products: fix own" on public.products for update to authenticated using ((select auth.uid()) = created_by) with check ((select auth.uid()) = created_by);
