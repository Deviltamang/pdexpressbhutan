-- Allow a vehicle listing to have multiple available colors.
-- Run this in the Supabase SQL Editor.

alter table public.vehicles
  add column if not exists colors text[] default '{}';

notify pgrst, 'reload schema';
