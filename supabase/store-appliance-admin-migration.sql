-- PD Express Store Appliance Admin upgrade
-- Run this in Supabase SQL editor before using the redesigned Store Admin form.

alter table public.products add column if not exists subcategory text;
alter table public.products add column if not exists specifications_json jsonb default '{}'::jsonb;
alter table public.products add column if not exists product_variants jsonb default '[]'::jsonb;
alter table public.products add column if not exists inventory_movements jsonb default '[]'::jsonb;
alter table public.products add column if not exists delivery_installation text;
alter table public.products add column if not exists supplier text;
alter table public.products add column if not exists purchase_cost numeric default 0;
alter table public.products add column if not exists invoice_number text;
alter table public.products add column if not exists stock_location text default 'Warehouse';
alter table public.products add column if not exists damage_notes text;
alter table public.products add column if not exists internal_remarks text;
alter table public.products add column if not exists low_stock_threshold integer default 3;

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  sku text,
  model_number text,
  colour text,
  capacity_value text,
  capacity_unit text,
  variant_specifications jsonb default '{}'::jsonb,
  selling_price numeric default 0,
  discount_percent numeric default 0,
  gst_percent numeric default 0,
  current_stock integer default 0,
  low_stock_threshold integer default 3,
  barcode text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid references public.product_variants(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  movement_type text not null check (movement_type in ('Opening Stock','New Stock Received','Sold','Transferred to Store 2','Damaged','Returned','Adjusted')),
  quantity integer not null default 0,
  location text default 'Warehouse',
  reason text,
  remarks text,
  created_by uuid,
  created_at timestamptz default now()
);

create index if not exists product_variants_product_id_idx on public.product_variants(product_id);
create index if not exists inventory_movements_product_id_idx on public.inventory_movements(product_id);
create index if not exists inventory_movements_variant_id_idx on public.inventory_movements(variant_id);

-- Optional public bucket for direct admin image uploads. Safe to run more than once.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- Basic public read and authenticated upload policies for product images.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Public read product images') then
    create policy "Public read product images" on storage.objects for select using (bucket_id = 'product-images');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Authenticated upload product images') then
    create policy "Authenticated upload product images" on storage.objects for insert to authenticated with check (bucket_id = 'product-images');
  end if;
end $$;

-- Store operations module: GST-aware product pricing, sales, customers and inventory history.
alter table public.products add column if not exists base_price numeric;
alter table public.products add column if not exists gst_percent numeric default 0;
update public.products set base_price = price where base_price is null and price is not null;

create table if not exists public.store_customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,
  address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.store_sales (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches(id) on delete set null,
  customer_id uuid references public.store_customers(id) on delete set null,
  sale_date date not null default current_date,
  bill_number text,
  basic_amount numeric not null default 0,
  gst_percent numeric not null default 0,
  gst_amount numeric not null default 0,
  discount_percent numeric not null default 0,
  discount_amount numeric not null default 0,
  delivery_charge numeric not null default 0,
  total_amount numeric not null default 0,
  payment_method text not null default 'Bank Transfer',
  bank_reference text,
  cash_amount numeric not null default 0,
  paid_amount numeric not null default 0,
  payment_status text not null default 'Paid',
  remarks text,
  created_by uuid,
  created_at timestamptz default now()
);

create table if not exists public.store_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid references public.store_sales(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  model_number text,
  quantity integer not null check (quantity > 0),
  basic_unit_price numeric not null default 0,
  gst_percent numeric not null default 0,
  gst_unit_amount numeric not null default 0,
  discount_percent numeric not null default 0,
  discount_unit_amount numeric not null default 0,
  final_unit_price numeric not null default 0,
  line_total numeric not null default 0,
  created_at timestamptz default now()
);

create index if not exists store_sales_date_idx on public.store_sales(sale_date desc);
create index if not exists store_sales_customer_idx on public.store_sales(customer_id);
create index if not exists store_sale_items_sale_idx on public.store_sale_items(sale_id);
create index if not exists store_sale_items_product_idx on public.store_sale_items(product_id);

-- Allow store-specific permissions without changing existing branch admin records.
create table if not exists public.store_staff_permissions (
  user_id uuid primary key references public.users(id) on delete cascade,
  permission_role text not null default 'store_admin' check (permission_role in ('store_admin','sales_staff','warehouse_staff','store_viewer','accountant')),
  can_manage_products boolean not null default true,
  can_record_sales boolean not null default true,
  can_manage_stock boolean not null default true,
  can_view_financial_reports boolean not null default true,
  updated_at timestamptz default now()
);

-- Enable RLS, then add authenticated policies. Tighten these to branch-specific policies before production launch.
alter table public.store_customers enable row level security;
alter table public.store_sales enable row level security;
alter table public.store_sale_items enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='store_customers' and policyname='Authenticated store customers access') then
    create policy "Authenticated store customers access" on public.store_customers for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='store_sales' and policyname='Authenticated store sales access') then
    create policy "Authenticated store sales access" on public.store_sales for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='store_sale_items' and policyname='Authenticated store sale items access') then
    create policy "Authenticated store sale items access" on public.store_sale_items for all to authenticated using (true) with check (true);
  end if;
end $$;
alter table public.store_sales add column if not exists customer_name text;
alter table public.store_sales add column if not exists customer_phone text;

alter table public.inventory_movements enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='inventory_movements' and policyname='Authenticated inventory movements access') then
    create policy "Authenticated inventory movements access" on public.inventory_movements for all to authenticated using (true) with check (true);
  end if;
end $$;


-- Product star ratings: use a numeric value, shown as stars in the Store UI.
alter table public.products add column if not exists energy_rating smallint check (energy_rating between 1 and 5);
