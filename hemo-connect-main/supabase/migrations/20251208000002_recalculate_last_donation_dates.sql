-- Recalculate last_donation_date for all donors to fix any incorrect dates
-- This uses MAX(donation_date) to ensure we get the most recent donation, not just the last inserted

-- Update last_donation_date for hospital-managed donors (via donor_id)
UPDATE public.donors
SET last_donation_date = (
  SELECT MAX(donation_date)
  FROM public.donations
  WHERE donations.donor_id = donors.id
)
WHERE EXISTS (
  SELECT 1 FROM public.donations WHERE donations.donor_id = donors.id
);

-- Set to NULL for donors with no donations
UPDATE public.donors
SET last_donation_date = NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.donations WHERE donations.donor_id = donors.id
);

