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
