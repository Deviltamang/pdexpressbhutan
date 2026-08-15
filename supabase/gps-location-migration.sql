-- PD Express GPS and property-location fields
-- Run this once in Supabase Dashboard → SQL Editor.

alter table public.properties
  add column if not exists address text,
  add column if not exists map_url text,
  add column if not exists latitude numeric,
  add column if not exists longitude numeric;

notify pgrst, 'reload schema';
