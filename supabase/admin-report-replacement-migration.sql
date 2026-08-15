-- Report replacement and duplicate-prevention update.
-- Run this AFTER admin-reporting-migration.sql and admin-reporting-fix.sql.

alter table public.branch_reports
  add column if not exists report_key text,
  add column if not exists content_hash text,
  add column if not exists updated_at timestamptz not null default now();

-- Each current report has one unique key. Sending an updated version replaces this row.
create unique index if not exists branch_reports_report_key_unique
on public.branch_reports(report_key)
where report_key is not null;

-- Allow a branch admin to replace only reports that they originally submitted.
drop policy if exists "Branch admins replace own reports" on public.branch_reports;
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

notify pgrst, 'reload schema';
