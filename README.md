# PD Express Bhutan — Listing-quality redesign

## Included
- Public Store, Real Estate and Motors pages with searchable live Supabase listings
- Up to 10 images per listing with clean gallery popups
- Coming Soon slider, shared by Store and Motors
- Featured Store Products, Featured Properties, Featured Vehicles, and New Arrivals sections on the Home page
- Listing descriptions, specifications, condition, warranty and property details
- Store low-stock dashboard alerts
- Product QR codes
- Super Admin styled Excel/PDF exports
- Super Admin admin-account controls through the existing `manage-admin` Edge Function
- Super Admin-only Staff & Branch Contact Directory
- Public Services, Company History, Terms, Warranty, Delivery and Privacy pages

## Removed
- Supplier management
- Supplier contact directory
- Purchase orders and purchase requests
- Store Operations dashboard page

## Required setup
1. Copy your working `.env` into the project root.
2. In Supabase SQL Editor, run:
   `supabase/multi-image-migration.sql`
   then
   `supabase/feature-redesign-migration.sql`
3. Keep your existing `manage-admin` Edge Function deployed if you use Super Admin admin-account controls.
4. Run:
   `npm install`
   `npm run dev`

## Notes
- The staff directory is visible and editable only to Super Admin.
- Store, Motors, and Real Estate Admins can mark their own listings as Featured, New Arrival, or Coming Soon.


## GPS locations
Run `supabase/gps-location-migration.sql` in Supabase SQL Editor. Store locations are configured at the top of `src/main.jsx` in `BRANCH_LOCATIONS`. To update PD Motors later, replace the `address` and `mapUrl` values for `motors`.


## PD Motors pricing update
Run `supabase/motors-gst-discount-migration.sql` in Supabase SQL Editor.

PD Motors Admin now:
- selects manufacturing year using a calendar date field;
- selects fuel type and transmission from dropdown menus;
- enters basic price, GST percentage, and discount percentage;
- sees a live price preview before saving.

Public PD Motors cards and gallery details show the GST breakdown. When discount is added, the GST-inclusive old price is struck through, the final price is shown, and a `X% OFF` bubble appears.


## Simplified Real Estate Admin form
Removed from the Real Estate Admin screen:
- Latitude and longitude
- Ownership type
- Land registration status
- Electricity connection
- Road access
- Water connection
- Property condition
- Featured on Home
- New arrival

Property type is now a dropdown with:
Land, House, Apartment, Commercial Space, Commercial Land, Office Space, Farm Land, Rental Property, and Other.

Existing Supabase columns and data are kept safely. No database migration is required for this UI change.


## Simplified Store Admin form and discounts
Removed from Store Admin:
- Product condition
- Warranty period
- Description
- Featured on Home
- New arrival

Category and Brand are now dropdowns. Store Admin can set discount percentage and an optional discount description. Public cards and product galleries show the struck-through old price, final discounted price, and `X% OFF` bubble.

Run `supabase/store-discount-migration.sql` in Supabase SQL Editor before testing discounts.


## Update: Staff Directory removed
The Super Admin Staff & Branch Contact Directory page, sidebar entry, and UI component were removed from this version.


## Update: Public Home page simplified
Removed the public Featured at PD Express and New Arrivals sections from the Home page. No database change is needed.


## Update: live listing counts placement
The Store, Property, Vehicle, and Admin-managed data counters on the Home page now appear immediately above the footer.


## Dynamic public UI upgrade
- The public Home hero supports an optional `public/hero-video.mp4` video background and `public/hero-poster.jpg` fallback image.
- Without media files, the hero uses animated light effects and a subtle grid.
- Public sections reveal as visitors scroll.
- Listing cards lift and zoom smoothly on hover.
- Home counters animate when they enter the screen.
- The Coming Soon section, live counters, tabs, and primary buttons have refined interactions.
- Motion respects the visitor's reduced-motion accessibility preference.


## Cinematic public UI redesign
The public user interface now uses an original automotive-style editorial design:
- transparent-to-solid scrolling header;
- full-screen media-ready home hero;
- large cinematic typography and graphic motion;
- premium three-division selector;
- stronger dark-to-light section pacing;
- a clean coming-soon showcase;
- live listing counters above the footer;
- improved Store, Real Estate, and Motors page hero presentation.

Optional files:
`public/hero-video.mp4` and `public/hero-poster.jpg`.


## Super Admin managed hero video and poster
Run `supabase/hero-media-super-admin.sql` in Supabase SQL Editor. Then use Dashboard → Hero media as Super Admin to upload an MP4/WebM and a JPG/PNG/WebP poster. Media is stored in the public Supabase Storage bucket named `hero-media`.


## Clean public redesign and hero fix
- Public Home now displays Super Admin media saved in `site_media`.
- The video URL is refreshed with the latest saved timestamp to prevent stale cached media.
- If the browser cannot play the uploaded video, the public hero automatically displays the uploaded poster image.
- The Home page has been simplified with more whitespace, fewer decorative elements, cleaner division cards, and a less congested layout.
- See `HERO-VIDEO-TROUBLESHOOTING.md` for supported video guidance.


## Hero video public display fix
The public Home page now reads `home-hero.json` directly from the public `hero-media` storage bucket first. This prevents an anonymous visitor from missing the hero video due to database Row Level Security or policy caching.

After installing this update:
1. Run `supabase/hero-media-public-config-fix.sql` in Supabase SQL Editor.
2. Go to Super Admin → Hero media.
3. Click **Save hero media** once more to create the public configuration file.
4. Open the public Home page and use Ctrl + Shift + R.


## Static Home redesign
- The Home hero now uses the Super Admin poster image only. It no longer tries to autoplay or display a video.
- The live statistics section is now above the contact banner, not below it.
- The lower Home page is rebuilt with compact stats, better spacing, balanced cards, and a cleaner closing section.
- Upload a high-quality landscape poster in Super Admin → Hero Media. Recommended ratio: 16:9, at least 1920×1080.


## Static video hero
The clean Home layout now uses the Super Admin uploaded video as a fixed full-screen hero background. There are no extra dynamic visual effects. If the video fails in a browser, the uploaded poster image is shown instead.


## Fixed hero video
The Home page now uses the bundled file `public/hero-video.mp4` only.
- No poster image is used.
- No Super Admin Hero Media upload is needed.
- The video is muted, loops automatically, and stays fixed behind the Home hero content.
- To change it in the future, replace `public/hero-video.mp4` with another MP4 using the exact same filename.


## Video layer fix
The fixed hero video uses normal positive z-index layers. This prevents it from being hidden behind the hero background.


## Update: Home contact banner removed
Removed the dark “Need help with a listing?” contact banner from the public Home page.


## Clickable mini maps
Store branch location cards now display a Google mini map rather than a directions button. Clicking anywhere on the mini map opens the existing Google Maps link in a new tab.

PD Motors is also ready for a mini map. Add its Google Maps URL to `BRANCH_LOCATIONS.motors.mapUrl` and replace the placeholder address in `src/main.jsx`.


## Status rows for public listings
Store, Real Estate, and PD Motors cards are grouped row-wise by the selected Admin status:
Available, Reserved, Sold, Coming Soon, and Out of Stock.

Only status rows that contain at least one listing are shown.


## Status-row sliders
Every public listing status group now displays as one horizontal slider. Cards no longer wrap onto a second row. Visitors can use left/right arrows on desktop or swipe horizontally on mobile.


## Responsive listing status sliders
Each status slider now adjusts based on screen width:
- Desktop and projector: maximum 3 cards visible
- Tablet: 2 cards visible
- Mobile: 1 full-width card visible

Extra cards remain in the horizontal slider. Cards do not wrap to another row or become narrow/cut off.


## Swipe-only sliders
All visible left/right navigation buttons were removed from:
- Listing status sliders
- Coming Soon slider
- Image gallery

Visitors can swipe on phones/tablets or click-drag using a mouse/trackpad on desktop. Gallery thumbnails remain available.


## Slider dots and no auto-slide
- Removed the Coming Soon pause/auto-slide button.
- All sliders are swipe-only.
- Status listing sliders and Coming Soon now show active position dots.
- No left/right buttons are displayed.


## Corrected smart-filter listing build
This package restores all Store, Real Estate, and Motors pages from the last working build. It then applies the smart display logic using the correct page variables:
- Store: q and cat
- Real Estate: q and type
- Motors: q and brand


## Single slider indicator
Removed the long native slider scrollbar. Each swipe slider now uses only the compact active-position dots directly below the cards.


## Correct two-row status sliders
Normal browsing now fills listing cards from left to right:
- Desktop: 3 cards in first row, then 3 cards in second row
- Tablet: 2 cards per row
- Phone: 1 card per row

Each swipe page contains up to six cards on desktop. The next page is available only when there are more than six cards.


## Final responsive listing-slider package
This build has been checked with `npm run build`.

For the responsive listing behavior, replace both:
- `src/main.jsx`
- `src/styles.css`

Do not copy only CSS, because the two-row page structure is implemented in `src/main.jsx`.


## Clear animation update
All public text and cards now use a clearer animation system:
- Hero text rises in clear stages.
- Section headings fade and move upward visibly.
- Cards rise in a staggered sequence.
- Filtered cards have a more obvious smooth entry.
- Hover lift and image zoom are clearer.
- Motion automatically reduces for visitors who use reduced-motion accessibility settings.

## Automatic New Arrival badge

Store products now receive a **New Arrival** badge automatically from their original `created_at` upload timestamp. The badge appears for 10 days and disappears automatically at the end of day 10. Editing the product does not restart the countdown. No Supabase cron job or SQL migration is needed for this feature.
