-- Fix donation count trigger to handle both donor_id and donor_user_id
-- The trigger counts actual donation records (not units) to prevent double-counting
-- This ensures donation_count reflects the actual number of donation records, not units

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
      last_donation_date = NEW.donation_date
    WHERE id = NEW.donor_id;
  END IF;
  
  -- Also update donor record if donor_user_id is set and there's a matching donor record
  -- This handles registered donors who have a donor record in the hospital's donors table
  IF NEW.donor_user_id IS NOT NULL THEN
    -- Update all donor records for this user_id (in case they exist in multiple hospitals)
    UPDATE public.donors
    SET 
      donation_count = (
        SELECT COUNT(*) FROM public.donations
        WHERE donor_id = donors.id
      ),
      last_donation_date = NEW.donation_date
    WHERE user_id = NEW.donor_user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

