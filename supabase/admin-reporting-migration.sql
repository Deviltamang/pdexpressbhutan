-- Branch-admin reporting workflow
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

alter table public.branch_reports enable row level security;

create policy "Branch admins submit own branch reports" on public.branch_reports
for insert to authenticated with check (
  submitted_by = auth.uid()
  and branch_id = (select branch_id from public.users where id = auth.uid())
);

create policy "Branch admins view own branch reports" on public.branch_reports
for select to authenticated using (
  branch_id = (select branch_id from public.users where id = auth.uid())
  or (select role from public.users where id = auth.uid()) = 'super_admin'
);

create policy "Super admins review branch reports" on public.branch_reports
for update to authenticated using ((select role from public.users where id = auth.uid()) = 'super_admin')
with check ((select role from public.users where id = auth.uid()) = 'super_admin');

notify pgrst, 'reload schema';
