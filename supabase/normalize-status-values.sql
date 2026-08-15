-- Run once in the Supabase SQL Editor to clean up inconsistent `status` values
-- (e.g. "Available", "Out of stock", "out of stock", "Coming Soon", "coming soon")
-- into the single internal snake_case format the app now expects everywhere:
--   draft, available, reserved, sold, coming_soon, out_of_stock, rented
--
-- Safe to run multiple times. It only rewrites values that are not already in
-- the clean internal format - it does not collapse distinct statuses together,
-- so any product/property/vehicle already marked Reserved, Sold, Draft, or
-- Coming soon keeps that exact status (unlike older one-off scripts in this
-- folder that reset everything to available/out_of_stock).

-- Store products
UPDATE public.products
SET status = lower(regexp_replace(trim(status), '\s+', '_', 'g'))
WHERE status IS NOT NULL
  AND status <> lower(regexp_replace(trim(status), '\s+', '_', 'g'));

-- Real estate properties
UPDATE public.properties
SET status = lower(regexp_replace(trim(status), '\s+', '_', 'g'))
WHERE status IS NOT NULL
  AND status <> lower(regexp_replace(trim(status), '\s+', '_', 'g'));

-- Motors vehicles
UPDATE public.vehicles
SET status = lower(regexp_replace(trim(status), '\s+', '_', 'g'))
WHERE status IS NOT NULL
  AND status <> lower(regexp_replace(trim(status), '\s+', '_', 'g'));

-- Anything left over that isn't one of the known internal values (for example
-- an old "in_stock" or blank string) falls back to "available" so it still
-- shows up correctly on the public site instead of disappearing.
UPDATE public.products
SET status = 'available'
WHERE status IS NULL OR status = '' OR status NOT IN
  ('draft', 'available', 'reserved', 'sold', 'coming_soon', 'out_of_stock');

UPDATE public.properties
SET status = 'available'
WHERE status IS NULL OR status = '' OR status NOT IN
  ('draft', 'available', 'reserved', 'sold', 'coming_soon', 'rented');

UPDATE public.vehicles
SET status = 'available'
WHERE status IS NULL OR status = '' OR status NOT IN
  ('draft', 'available', 'reserved', 'sold', 'coming_soon');
