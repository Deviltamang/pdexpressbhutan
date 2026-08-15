-- Store product discount fields
-- Run this in Supabase SQL Editor after your existing migrations.

alter table public.products
  add column if not exists discount_percent numeric(6,2) not null default 0,
  add column if not exists discount_description text;

notify pgrst, 'reload schema';
