
-- PD Express listing-quality and staff-directory redesign
-- Run this file in Supabase SQL Editor after your existing base schema.

-- Store product fields
alter table public.products
  add column if not exists brand text,
  add column if not exists model_number text,
  add column if not exists description text,
  add column if not exists specifications text,
  add column if not exists product_condition text,
  add column if not exists warranty_period text,
  add column if not exists warranty_details text,
  add column if not exists featured boolean not null default false,
  add column if not exists new_arrival boolean not null default false;

-- PD Motors fields
alter table public.vehicles
  add column if not exists description text,
  add column if not exists specifications text,
  add column if not exists vehicle_condition text,
  add column if not exists warranty_period text,
  add column if not exists warranty_details text,
  add column if not exists featured boolean not null default false,
  add column if not exists new_arrival boolean not null default false;

-- Real estate fields
alter table public.properties
  add column if not exists description text,
  add column if not exists ownership_type text,
  add column if not exists registration_status text,
  add column if not exists road_access text,
  add column if not exists water_connection text,
  add column if not exists electricity_connection text,
  add column if not exists property_condition text,
  add column if not exists featured boolean not null default false,
  add column if not exists new_arrival boolean not null default false;

-- Internal staff / branch contact directory
create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text not null,
  branch_id uuid references public.branches(id) on delete set null,
  phone text,
  email text,
  status text not null default 'Active' check (status in ('Active','Inactive')),
  emergency_contact text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.staff_members enable row level security;

drop policy if exists "super_admin_manage_staff" on public.staff_members;
create policy "super_admin_manage_staff"
on public.staff_members
for all
using (public.is_super_admin())
with check (public.is_super_admin());

notify pgrst, 'reload schema';
