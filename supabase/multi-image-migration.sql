
-- PD Express Bhutan: multi-image support (up to 10 image URLs per listing)
-- Run this in Supabase SQL Editor.

alter table public.products
  add column if not exists image_urls text[] default '{}';

alter table public.properties
  add column if not exists image_urls text[] default '{}';

alter table public.vehicles
  add column if not exists image_urls text[] default '{}';

-- Optional validation trigger: reject more than 10 image URLs.
create or replace function public.limit_listing_images()
returns trigger
language plpgsql
as $$
begin
  if array_length(new.image_urls, 1) > 10 then
    raise exception 'A listing can contain a maximum of 10 images.';
  end if;
  return new;
end;
$$;

drop trigger if exists products_limit_images on public.products;
create trigger products_limit_images
before insert or update on public.products
for each row execute function public.limit_listing_images();

drop trigger if exists properties_limit_images on public.properties;
create trigger properties_limit_images
before insert or update on public.properties
for each row execute function public.limit_listing_images();

drop trigger if exists vehicles_limit_images on public.vehicles;
create trigger vehicles_limit_images
before insert or update on public.vehicles
for each row execute function public.limit_listing_images();

notify pgrst, 'reload schema';
