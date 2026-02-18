-- Recalculate all donation counts based on actual donation records
-- This fixes any incorrect counts that were caused by double-counting

-- Update donation counts for all hospital-managed donors
UPDATE public.donors
SET donation_count = (
  SELECT COUNT(*) 
  FROM public.donations 
  WHERE donations.donor_id = donors.id
);

-- Update last_donation_date for all donors based on their most recent donation
UPDATE public.donors
SET last_donation_date = (
  SELECT MAX(donation_date)
  FROM public.donations
  WHERE donations.donor_id = donors.id
)
WHERE EXISTS (
  SELECT 1 FROM public.donations WHERE donations.donor_id = donors.id
);

