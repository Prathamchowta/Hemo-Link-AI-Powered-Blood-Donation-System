-- Quick script to delete ONLY Pallavi S Shetty's donations
-- This is safer than deleting all donations

-- Step 1: View Pallavi's donations before deleting (for verification)
SELECT 
  id,
  donation_date,
  blood_group,
  units_donated,
  hospital_id
FROM public.donations
WHERE donor_user_id = '7ec0e873-5cf5-4c4c-b40e-4ff7b96acc93'
ORDER BY donation_date DESC;

-- Step 2: Delete Pallavi's donations
-- Uncomment the line below to actually delete
-- DELETE FROM public.donations
-- WHERE donor_user_id = '7ec0e873-5cf5-4c4c-b40e-4ff7b96acc93';

-- Step 3: Reset Pallavi's donation count in the donors table (if she's linked to a hospital)
-- This will update all donor records linked to Pallavi's user_id
UPDATE public.donors
SET 
  donation_count = 0,
  last_donation_date = NULL
WHERE user_id = '7ec0e873-5cf5-4c4c-b40e-4ff7b96acc93';

-- Step 4: Verify deletion (should return 0 rows)
SELECT COUNT(*) as remaining_donations
FROM public.donations
WHERE donor_user_id = '7ec0e873-5cf5-4c4c-b40e-4ff7b96acc93';

