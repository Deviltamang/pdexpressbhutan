-- Adds optional video support to PD Motors vehicle listings.
-- The video file itself is uploaded to the existing public "product-images"
-- storage bucket (same bucket already used for listing images, under a
-- vehicles/ path prefix) - no new bucket or storage policy is needed since
-- that bucket already has public read + authenticated insert policies from
-- store-appliance-admin-migration.sql.

alter table public.vehicles
  add column if not exists video_url text;

comment on column public.vehicles.video_url is
  'Optional public URL of an uploaded vehicle video (MP4/MOV/WebM). Null when no video has been added.';
