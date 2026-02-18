-- Add email field to donors table
ALTER TABLE public.donors ADD COLUMN IF NOT EXISTS email TEXT;