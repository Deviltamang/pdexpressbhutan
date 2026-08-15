-- Fix for branch-reporting screen and Store report submission.
-- Run this AFTER admin-reporting-migration.sql in Supabase SQL Editor.

-- The public.users profile table does not contain an email column.
-- The application now reads the sender safely from branch information instead.

-- Recreate policies so each logged-in branch admin can insert a report for only their branch,
-- while the Super Admin can read and review every branch report.
drop policy if exists "Branch admins submit own branch reports" on public.branch_reports;
drop policy if exists "Branch admins view own branch reports" on public.branch_reports;
drop policy if exists "Super admins review branch reports" on public.branch_reports;

create policy "Branch admins submit own branch reports" on public.branch_reports
for insert to authenticated
with check (
  submitted_by = auth.uid()
  and exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.branch_id = branch_reports.branch_id
  )
);

create policy "Branch admins and Super Admin view reports" on public.branch_reports
for select to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and (u.branch_id = branch_reports.branch_id or u.role = 'super_admin')
  )
);

create policy "Super Admin reviews reports" on public.branch_reports
for update to authenticated
using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'super_admin')
)
with check (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'super_admin')
);

notify pgrst, 'reload schema';
