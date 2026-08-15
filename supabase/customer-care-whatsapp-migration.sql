-- Site-wide "Customer Care" WhatsApp contact.
-- Used by the floating WhatsApp button (all pages) and the Contact page,
-- instead of a per-branch number. Editable only by Super Admin.
-- Run this in the Supabase SQL Editor.

create table if not exists public.site_contact (
  contact_key text primary key,
  whatsapp_number text,
  whatsapp_link text,
  updated_at timestamptz not null default now()
);

insert into public.site_contact (contact_key)
values ('customer_care')
on conflict (contact_key) do nothing;

alter table public.site_contact enable row level security;

drop policy if exists "Public can read site contact" on public.site_contact;
create policy "Public can read site contact" on public.site_contact
for select using (true);

drop policy if exists "Super admins manage site contact" on public.site_contact;
create policy "Super admins manage site contact" on public.site_contact
for all using (public.is_super_admin()) with check (public.is_super_admin());

notify pgrst, 'reload schema';
