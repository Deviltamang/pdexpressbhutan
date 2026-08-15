-- Run once after deploying the Store Admin stock-status update.
-- Sets product status based on existing total_stock and sold_quantity.
UPDATE public.products
SET status = CASE
  WHEN COALESCE(sold_quantity, 0) >= COALESCE(total_stock, 0) THEN 'out_of_stock'
  WHEN status IN ('available', 'out_of_stock') THEN 'available'
  ELSE status
END
WHERE category IS NOT NULL;
