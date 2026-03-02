
-- Step 1: Add new enum values only
ALTER TYPE public.entry_status ADD VALUE IF NOT EXISTS 'siap_input' AFTER 'belum_lengkap';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_input';
