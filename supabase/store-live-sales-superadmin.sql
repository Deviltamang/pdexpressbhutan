-- PD Express: Store sales are live for Super Admin
-- Run once in Supabase SQL Editor. Safe to run more than once.

-- Keep Store sales visible to Super Admin so no manual Store report needs to be sent.
alter table public.store_sales enable row level security;
alter table public.store_sale_items enable row level security;

drop policy if exists "Super Admin reads store sales reports" on public.store_sales;
create policy "Super Admin reads store sales reports" on public.store_sales
for select to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'super_admin'
  )
);

drop policy if exists "Super Admin reads store sale items reports" on public.store_sale_items;
create policy "Super Admin reads store sale items reports" on public.store_sale_items
for select to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'super_admin'
  )
);

-- Remove legacy Store branch_reports entries created by the old Send to Super Admin feature.
-- Store sales remain safely stored in store_sales and store_sale_items.
delete from public.branch_reports br
using public.branches b
where br.branch_id = b.id
  and lower(coalesce(b.slug, '')) = 'store';

notify pgrst, 'reload schema';
