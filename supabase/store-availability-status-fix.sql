-- Run this in Supabase after deploying the simplified stock update.
-- Available stock is always total_stock minus sold_quantity.
-- A product is Out of Stock only when sold quantity reaches total stock.

UPDATE public.products
SET status = CASE
  WHEN COALESCE(total_stock, 0) > 0
       AND COALESCE(sold_quantity, 0) < COALESCE(total_stock, 0) THEN 'available'
  WHEN COALESCE(total_stock, 0) > 0
       AND COALESCE(sold_quantity, 0) >= COALESCE(total_stock, 0) THEN 'out_of_stock'
  WHEN COALESCE(total_stock, 0) = 0 THEN 'out_of_stock'
  ELSE status
END
WHERE category IS NOT NULL;

-- SKU and variant/inventory JSON fields are no longer used by the Store Admin UI.
-- They are intentionally kept in the database so existing product records are not deleted.
