Public hero media loading

The public Home page first reads:
Supabase Storage bucket: hero-media
File: home-hero.json

Super Admin automatically creates/updates this file when Save hero media is pressed.
This makes the public page independent of database RLS policies.

After updating this project:
1. Run supabase/hero-media-public-config-fix.sql
2. Open Super Admin → Hero media
3. Press Save hero media once more, even if the current URLs are already filled
4. Open the Home page and press Ctrl + Shift + R
