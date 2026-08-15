-- "Manage Locations" - lets the Super Admin control the public "Visit Us"
-- store-locations section from the dashboard instead of editing site code.
-- Reuses the existing public.is_super_admin() function already relied on by
-- hero-media-super-admin.sql / branch-whatsapp-settings-migration.sql etc.

create table if not exists public.store_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_type text not null default 'PDExpress Store',
  address text,
  description text,
  map_url text,
  map_embed_url text,
  latitude numeric,
  longitude numeric,
  display_order integer not null default 0,
  is_active boolean not null default true,
  is_coming_soon boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.store_locations enable row level security;

-- Public (including anonymous site visitors) can only ever see active
-- locations. Super admins match this policy too when a location happens to
-- be active, and additionally match the policy below for everything else,
-- so they see the full list (active + hidden) in the dashboard.
drop policy if exists "Public can view active locations" on public.store_locations;
create policy "Public can view active locations"
  on public.store_locations for select
  using (is_active = true);

-- Only super admins may view hidden rows or make any changes.
drop policy if exists "Super admins manage locations" on public.store_locations;
create policy "Super admins manage locations"
  on public.store_locations for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Seed the same 3 locations that were previously hardcoded in the site code,
-- so the public "Visit Us" section keeps showing the same content right
-- after this migration runs. Nothing changes for site visitors until the
-- Super Admin edits these from Manage Locations. Guarded so re-running this
-- migration never creates duplicates.
insert into public.store_locations
  (name, business_type, address, map_url, display_order, is_active, is_coming_soon)
select * from (values
  ('PDExpress Store — Hongkong Market', 'PDExpress Store', 'Hongkong Market, above Sangay Enterprise / Avenue 28', 'https://maps.app.goo.gl/EkMjt6FCv7mMNfXX9', 1, true, false),
  ('PDExpress Store — Thimphu Thromdhe Area', 'PDExpress Store', 'Opposite Thimphu Thromdhe Office, above Tomza', 'https://maps.app.goo.gl/mF9FH3GhS7Nezodq9', 2, true, false),
  ('PD Motors Showroom', 'PD Motors Showroom', 'Showroom location coming soon', '', 3, true, true)
) as seed(name, business_type, address, map_url, display_order, is_active, is_coming_soon)
where not exists (select 1 from public.store_locations);
