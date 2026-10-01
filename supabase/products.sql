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
