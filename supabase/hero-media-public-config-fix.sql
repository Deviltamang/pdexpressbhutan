-- Public Hero Media Fix
-- Run this once in Supabase SQL Editor.
-- It keeps media files readable publicly and lets Super Admin save home-hero.json.

insert into storage.buckets (id, name, public)
values ('hero-media', 'hero-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Super admins update public hero config" on storage.objects;
create policy "Super admins update public hero config"
on storage.objects
for update
using (bucket_id = 'hero-media' and name = 'home-hero.json' and public.is_super_admin())
with check (bucket_id = 'hero-media' and name = 'home-hero.json' and public.is_super_admin());

drop policy if exists "Super admins insert public hero config" on storage.objects;
create policy "Super admins insert public hero config"
on storage.objects
for insert
with check (bucket_id = 'hero-media' and name = 'home-hero.json' and public.is_super_admin());

notify pgrst, 'reload schema';
