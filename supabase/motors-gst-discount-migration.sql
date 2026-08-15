-- PD Motors pricing and form simplification
-- Run in Supabase SQL Editor after existing schema migrations.

alter table public.vehicles
  add column if not exists manufacture_date date,
  add column if not exists base_price numeric(14,2),
  add column if not exists gst_percent numeric(6,2) not null default 0,
  add column if not exists discount_percent numeric(6,2) not null default 0;

-- Copy existing displayed price into basic price only where it is currently empty.
update public.vehicles
set base_price = price
where base_price is null and price is not null;

-- Existing year values remain supported. New vehicle entries save a calendar date
-- and automatically retain its year for old parts of the app.

notify pgrst, 'reload schema';
