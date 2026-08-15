-- Per-branch WhatsApp enquiry settings.
-- Run this in the Supabase SQL Editor.

alter table public.branches add column if not exists whatsapp_number text;
alter table public.branches add column if not exists whatsapp_link text;

-- Store branch uses a direct phone number (supports pre-filled, editable messages).
update public.branches set whatsapp_number = '97577889446'
where slug = 'store' and whatsapp_number is null;

-- Motors and Real Estate keep the existing shared WhatsApp business link.
update public.branches set whatsapp_link = 'https://wa.me/message/PORGXEPDD5K3C1'
where slug in ('motors', 'real-estate') and whatsapp_link is null;

alter table public.branches enable row level security;

drop policy if exists "Public can read branches" on public.branches;
create policy "Public can read branches" on public.branches
for select using (true);

drop policy if exists "Super admins manage branches" on public.branches;
create policy "Super admins manage branches" on public.branches
for all using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "Branch admins update own branch contact" on public.branches;
create policy "Branch admins update own branch contact" on public.branches
for update using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.branch_id = branches.id
      and u.role in ('store_admin', 'real_estate_admin', 'motors_admin')
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.branch_id = branches.id
      and u.role in ('store_admin', 'real_estate_admin', 'motors_admin')
  )
);

notify pgrst, 'reload schema';
