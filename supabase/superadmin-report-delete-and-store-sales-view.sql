-- PD Express reporting: let Super Admin read Store sales and delete any submitted branch report.
-- Run once in Supabase SQL Editor.

alter table public.store_sales enable row level security;
alter table public.store_sale_items enable row level security;

drop policy if exists "Super Admin reads store sales reports" on public.store_sales;
create policy "Super Admin reads store sales reports" on public.store_sales
for select to authenticated using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'super_admin')
);

drop policy if exists "Super Admin reads store sale items reports" on public.store_sale_items;
create policy "Super Admin reads store sale items reports" on public.store_sale_items
for select to authenticated using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'super_admin')
);

drop policy if exists "Super Admin deletes reports" on public.branch_reports;
create policy "Super Admin deletes reports" on public.branch_reports
for delete to authenticated using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'super_admin')
);

notify pgrst, 'reload schema';
