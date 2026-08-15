-- Unify WhatsApp contact across all three branches.
-- The wa.me/message/<code> short link does not support the ?text= pre-fill
-- parameter (only a plain wa.me/<number> link does), which is why Real Estate
-- and Motors enquiries were opening WhatsApp without the product details.
-- Run this in the Supabase SQL Editor.

update public.branches
set whatsapp_number = '97577889446',
    whatsapp_link = 'https://wa.me/message/PORGXEPDD5K3C1'
where slug in ('store', 'real-estate', 'motors');

notify pgrst, 'reload schema';
