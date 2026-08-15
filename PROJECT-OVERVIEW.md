# PD Express Bhutan — Project Overview

A single-page web application for **PD Express Bhutan** (https://pdexpressbhutan.com), a Bhutanese business group operating three divisions: an appliance/electronics **Store**, **Real Estate** listings, and **PD Motors** (vehicles). The site combines a public marketing/listings website with a role-based admin dashboard, all backed by Supabase.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + React Router 6, built with Vite 6 |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions) |
| Styling | Single hand-written stylesheet (`src/styles.css`, ~3,100 lines) — no CSS framework |
| Icons | lucide-react |
| Charts | Recharts (admin reports) |
| Exports | jsPDF + jspdf-autotable (PDF), xlsx-js-style (styled Excel) |
| QR codes | qrcode.react (per-product QR codes) |
| Email | EmailJS (contact/enquiry form) |

Almost the entire application lives in **`src/main.jsx`** (~2,800 lines): all pages, components, admin dashboard, and data fetching. `src/supabase.js` is a 6-line client factory that returns `null` when env vars are missing, so the UI can render with empty fallback data.

## Project structure

```
├── index.html                  # SEO-heavy shell: meta tags, Open Graph, JSON-LD structured data
├── package.json                # npm scripts: dev / build / preview
├── .env                        # Supabase + EmailJS keys (VITE_* vars, not committed publicly)
├── src/
│   ├── main.jsx                # Entire app: routes, pages, dashboard, components
│   ├── styles.css              # All styling, responsive rules, animations
│   └── supabase.js             # Supabase client (null-safe if .env missing)
├── public/                     # Static assets: logos, hero-video.mp4, favicons,
│                               # robots.txt, sitemap.xml, .htaccess (SPA rewrite)
├── dist/                       # Latest production build (vite build output)
├── supabase/
│   ├── *.sql                   # ~24 incremental migrations (run manually in SQL Editor)
│   └── functions/manage-admin/ # Deno Edge Function: Super Admin creates/updates admin accounts
├── dev-notes/                  # Hero media setup notes
├── pdexpress-hostgator-deploy.zip  # Ready-to-upload HostGator deployment bundle
└── *.md                        # ~20 changelog notes, one per past feature/fix
```

## Public site (routes)

All public routes render inside a shared `Layout` (transparent-to-solid header, footer with branch locations, floating WhatsApp button):

- `/` — Home: fixed full-screen hero video (`public/hero-video.mp4`), three-division selector, services section, animated live listing counters
- `/store`, `/real-estate`, `/motors` — division pages with search + category/type/brand filters; listings grouped into status rows (Available, Reserved, Sold, Coming Soon, Out of Stock) shown as swipe-only responsive sliders (3 cards desktop / 2 tablet / 1 mobile, two rows per swipe page, dot indicators)
- `/listing/:kind/:id` — listing detail page with multi-image gallery (up to 10 images)
- `/about`, `/services`, `/history`, `/terms`, `/warranty`, `/delivery`, `/privacy`, `/contact` — info pages
- `/login`, `/reset-password` — admin authentication

Notable public behavior:
- **Pricing**: Store and Motors show basic price + GST%, and when a discount is set, a struck-through old price, final price, and an "X% OFF" bubble.
- **New Arrival badge**: applied automatically for 10 days from a product's `created_at`; no cron or migration needed.
- **Branch mini-maps**: clickable Google mini maps per branch, configured in `BRANCH_LOCATIONS` at the top of `src/main.jsx`.
- Animations respect the visitor's reduced-motion preference.

## Admin dashboard (`/dashboard`)

Role-based, driven by the `users` table (joined to `branches`):

- **`super_admin`** — sees all branches; Excel/PDF export reports, branch report review, live store sales view, admin-account management (via the `manage-admin` Edge Function), Hero Media manager (uploads to the public `hero-media` storage bucket), Customer Care WhatsApp settings
- **`store_admin`** — appliance products with category/brand dropdowns, per-category spec fields, colors/variants, stock movements, bulk import, discounts, QR codes, low-stock alerts, sales recording (`store_sales` / `store_sale_items` / `store_customers`)
- **`real_estate_admin`** — simplified property form (property-type dropdown)
- **`motors_admin`** — vehicles with year/fuel/transmission dropdowns, GST + discount pricing with live preview

Each branch admin manages only their own listings and can set status (Available/Reserved/Sold/Coming Soon/Out of Stock) plus Featured/Coming Soon flags. Branch-level and customer-care WhatsApp numbers are configurable in the dashboard.

## Supabase backend

- **Main tables**: `products`, `properties`, `vehicles`, `branches`, `users`, `branch_reports`, `store_sales`, `store_sale_items`, `store_customers`, `site_media`, `site_contact`
- **Storage buckets**: `product-images` (listing photos), `hero-media` (legacy hero video/poster + `home-hero.json` public config)
- **Edge Function**: `supabase/functions/manage-admin` — Super Admin-only account creation/management using the service-role key
- **Migrations**: the `supabase/*.sql` files are incremental and were applied manually through the Supabase SQL Editor as features shipped. The README's baseline order is `multi-image-migration.sql` → `feature-redesign-migration.sql`, followed by feature-specific ones (discounts, GST, reporting fixes, WhatsApp settings, status fixes, etc.).

## Environment variables (`.env`)

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_EMAILJS_SERVICE_ID
VITE_EMAILJS_TEMPLATE_ID
VITE_EMAILJS_PUBLIC_KEY
```

## Running and deploying

```bash
npm install
npm run dev       # local dev server (Vite)
npm run build     # production build → dist/
npm run preview   # serve the built dist/ locally
```

Deployment targets **HostGator** (shared hosting): upload the contents of `dist/` (see `pdexpress-hostgator-deploy.zip`). `public/.htaccess` is included in the build to rewrite all paths to `index.html` for React Router's browser history routing.

## History / changelog notes

The many `*-UPDATE.md` / `*-FIX*.md` files at the root (plus the long, append-style `README.md`) are per-feature changelogs from earlier iterations — hero video changes, slider behavior, store admin simplifications, reporting fixes, etc. They document *why* each migration in `supabase/` exists. The current source already includes all of those changes; this folder name ("dropdown-cooling-fixed") reflects the most recent fix iteration.
