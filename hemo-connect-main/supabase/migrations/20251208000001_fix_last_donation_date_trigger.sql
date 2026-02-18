-- Fix the trigger to always use MAX(donation_date) instead of NEW.donation_date
-- This ensures last_donation_date shows the most recent donation date, not just the last inserted record
-- (Important when backdating donations or when donations are recorded out of order)

CREATE OR REPLACE FUNCTION public.update_donor_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update hospital-managed donor stats (when donor_id is set)
  IF NEW.donor_id IS NOT NULL THEN
    UPDATE public.donors
    SET 
      donation_count = (
        SELECT COUNT(*) FROM public.donations
        WHERE donor_id = NEW.donor_id
      ),
      last_donation_date = (
        SELECT MAX(donation_date) FROM public.donations
        WHERE donor_id = NEW.donor_id
      )
    WHERE id = NEW.donor_id;
  END IF;
  
  -- Also update donor record if donor_user_id is set and there's a matching donor record
  -- This handles registered donors who have a donor record in the hospital's donors table
  IF NEW.donor_user_id IS NOT NULL THEN
    -- Update all donor records for this user_id (in case they exist in multiple hospitals)
    -- Use MAX to get the most recent donation date from donations with this donor_id
    UPDATE public.donors
    SET 
      donation_count = (
        SELECT COUNT(*) FROM public.donations
        WHERE donor_id = donors.id
      ),
      last_donation_date = (
        SELECT MAX(donation_date) FROM public.donations
        WHERE donor_id = donors.id
      )
    WHERE user_id = NEW.donor_user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

