-- Super Admin managed Home hero media
-- Run this in Supabase SQL Editor.

create table if not exists public.site_media (
  media_key text primary key,
  video_url text,
  poster_url text,
  updated_at timestamptz not null default now()
);

alter table public.site_media enable row level security;

drop policy if exists "Public can read site media" on public.site_media;
create policy "Public can read site media" on public.site_media
for select using (true);

drop policy if exists "Super admins manage site media" on public.site_media;
create policy "Super admins manage site media" on public.site_media
for all using (public.is_super_admin()) with check (public.is_super_admin());

insert into storage.buckets (id, name, public)
values ('hero-media', 'hero-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Public reads hero media" on storage.objects;
create policy "Public reads hero media" on storage.objects
for select using (bucket_id = 'hero-media');

drop policy if exists "Super admins upload hero media" on storage.objects;
create policy "Super admins upload hero media" on storage.objects
for insert with check (bucket_id = 'hero-media' and public.is_super_admin());

drop policy if exists "Super admins update hero media" on storage.objects;
create policy "Super admins update hero media" on storage.objects
for update using (bucket_id = 'hero-media' and public.is_super_admin()) with check (bucket_id = 'hero-media' and public.is_super_admin());

drop policy if exists "Super admins delete hero media" on storage.objects;
create policy "Super admins delete hero media" on storage.objects
for delete using (bucket_id = 'hero-media' and public.is_super_admin());

notify pgrst, 'reload schema';
