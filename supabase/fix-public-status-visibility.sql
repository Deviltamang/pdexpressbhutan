supabase/fix-public-status-visibility.sql i-- CRITICAL FIX: the public/anonymous role currently cannot see products,
-- properties, or vehicles with status = reserved, sold, out_of_stock, or
-- rented at all - confirmed directly against the live database. Only
-- 'available' and 'coming_soon' rows are visible to the public site today.
-- This is why Reserved/Sold/Out of stock/Rented never show up on the public
-- Store/Real Estate/Motors pages no matter what the admin selects - the row
-- exists and is correct, Supabase Row Level Security is just hiding it from
-- anyone who isn't logged in.
--
-- This does not touch or remove whatever policy already exists (so it can't
-- accidentally lock anyone out) - Postgres combines multiple permissive
-- policies for the same action with OR, so adding this alongside the
-- existing policy only ever widens public visibility, never narrows it.
-- The only status that stays hidden from the public is 'draft', which is
-- exactly what's required (draft is admin-only).
--
-- Run once in the Supabase SQL Editor.

drop policy if exists "Public read non-draft products" on public.products;
create policy "Public read non-draft products" on public.products
for select to anon
using (status is distinct from 'draft');

drop policy if exists "Public read non-draft properties" on public.properties;
create policy "Public read non-draft properties" on public.properties
for select to anon
using (status is distinct from 'draft');

drop policy if exists "Public read non-draft vehicles" on public.vehicles;
create policy "Public read non-draft vehicles" on public.vehicles
for select to anon
using (status is distinct from 'draft');
