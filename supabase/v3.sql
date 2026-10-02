-- Tempra v3: daily AI allowance per account and push reminders. Run once in the Supabase SQL editor.

-- Daily count of AI calls (coach chat, photo analysis) per account. Only the server, with the service key, reads or writes it.
create table if not exists public.usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'Europe/Rome')::date,
  kind text not null,
  count integer not null default 0,
  primary key (user_id, day, kind)
);
alter table public.usage enable row level security;

-- Adds one use and says whether it is still within the daily allowance.
create or replace function public.bump_usage(uid uuid, kind text, max_per_day integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  insert into public.usage as u (user_id, day, kind, count) values (uid, (now() at time zone 'Europe/Rome')::date, kind, 1)
  on conflict (user_id, day, kind) do update set count = u.count + 1
  returning u.count into n;
  return n <= max_per_day;
end $$;
revoke all on function public.bump_usage(uuid, text, integer) from public, anon, authenticated;

-- Push reminders: one row per device that turned them on.
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "own push: select" on public.push_subscriptions;
drop policy if exists "own push: insert" on public.push_subscriptions;
drop policy if exists "own push: update" on public.push_subscriptions;
drop policy if exists "own push: delete" on public.push_subscriptions;
create policy "own push: select" on public.push_subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy "own push: insert" on public.push_subscriptions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own push: update" on public.push_subscriptions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own push: delete" on public.push_subscriptions for delete to authenticated using ((select auth.uid()) = user_id);
