-- Allow a store product to have multiple available colors.
-- Replaces the old single free-text "Colour" specification field
-- for Refrigerators, Washing Machines, and Other Appliances.
-- Run this in the Supabase SQL Editor.

alter table public.products
  add column if not exists colors text[] default '{}';

notify pgrst, 'reload schema';
