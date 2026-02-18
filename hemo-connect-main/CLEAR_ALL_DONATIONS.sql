-- Script to delete ALL donations from the database
-- WARNING: This will permanently delete ALL donation records!
-- Make sure you really want to do this before running.

-- Step 1: View all donations before deleting (for verification)
SELECT COUNT(*) as total_donations FROM public.donations;

-- Step 2: View breakdown by donor
SELECT 
  donor_user_id,
  COUNT(*) as donation_count
FROM public.donations
WHERE donor_user_id IS NOT NULL
GROUP BY donor_user_id
ORDER BY donation_count DESC;

-- Step 3: DELETE ALL DONATIONS
-- ⚠️ UNCOMMENT THE LINE BELOW TO ACTUALLY DELETE ⚠️
-- DELETE FROM public.donations;

-- Step 4: Reset all donation counts in the donors table
UPDATE public.donors
SET 
  donation_count = 0,
  last_donation_date = NULL;

-- Step 5: Verify deletion (should return 0)
SELECT COUNT(*) as remaining_donations FROM public.donations;

