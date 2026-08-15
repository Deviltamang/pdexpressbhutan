-- PD Express: complete reporting repair
-- Run this single file in Supabase SQL Editor. It is safe to run more than once.

create table if not exists public.branch_reports (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  submitted_by uuid references public.users(id) on delete set null,
  title text not null,
  report_type text not null default 'Weekly update',
  reporting_period text,
  summary text not null,
  attachment_url text,
  status text not null default 'new' check (status in ('new','reviewed')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.branch_reports
  add column if not exists report_key text,
  add column if not exists content_hash text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.branch_reports enable row level security;

create unique index if not exists branch_reports_report_key_unique
on public.branch_reports(report_key)
where report_key is not null;

drop policy if exists "Branch admins submit own branch reports" on public.branch_reports;
drop policy if exists "Branch admins view own branch reports" on public.branch_reports;
drop policy if exists "Super admins review branch reports" on public.branch_reports;
drop policy if exists "Branch admins and Super Admin view reports" on public.branch_reports;
drop policy if exists "Super Admin reviews reports" on public.branch_reports;
drop policy if exists "Branch admins replace own reports" on public.branch_reports;

create policy "Branch admins submit own branch reports" on public.branch_reports
for insert to authenticated with check (
  submitted_by = auth.uid()
  and exists (select 1 from public.users u where u.id = auth.uid() and u.branch_id = branch_reports.branch_id)
);

create policy "Branch admins and Super Admin view reports" on public.branch_reports
for select to authenticated using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and (u.branch_id = branch_reports.branch_id or u.role = 'super_admin')
  )
);

create policy "Branch admins replace own reports" on public.branch_reports
for update to authenticated
using (
  submitted_by = auth.uid()
  and exists (select 1 from public.users u where u.id = auth.uid() and u.branch_id = branch_reports.branch_id)
)
with check (
  submitted_by = auth.uid()
  and exists (select 1 from public.users u where u.id = auth.uid() and u.branch_id = branch_reports.branch_id)
);

create policy "Super Admin reviews reports" on public.branch_reports
for update to authenticated
using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'super_admin'))
with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'super_admin'));

notify pgrst, 'reload schema';
