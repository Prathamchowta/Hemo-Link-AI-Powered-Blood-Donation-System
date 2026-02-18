-- Add certificate fields back to donations table
-- This enables AI-generated certificates for completed donations

ALTER TABLE public.donations 
ADD COLUMN IF NOT EXISTS certificate_generated BOOLEAN DEFAULT false;

ALTER TABLE public.donations 
ADD COLUMN IF NOT EXISTS certificate_url TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_donations_certificate_generated ON public.donations(certificate_generated);

