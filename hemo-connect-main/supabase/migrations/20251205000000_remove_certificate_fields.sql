-- Remove certificate-related fields from donations table
-- This migration removes the certificate functionality from the system

ALTER TABLE public.donations 
DROP COLUMN IF EXISTS certificate_generated;

ALTER TABLE public.donations 
DROP COLUMN IF EXISTS certificate_url;
