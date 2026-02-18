-- Script to clear donations from the database
-- WARNING: This will permanently delete donation records. Make sure you have a backup if needed.

-- Option 1: Delete only Pallavi S Shetty's donations
-- Uncomment the lines below and run to delete only Pallavi's donations

-- DELETE FROM public.donations
-- WHERE donor_user_id = '7ec0e873-5cf5-4c4c-b40e-4ff7b96acc93';

-- Option 2: Delete ALL donations (use with caution!)
-- Uncomment the line below to delete ALL donations from ALL donors

-- DELETE FROM public.donations;

-- Option 3: Delete donations for a specific donor by name (if you know their user_id)
-- Replace 'DONOR_USER_ID' with the actual user_id
-- DELETE FROM public.donations
-- WHERE donor_user_id = 'DONOR_USER_ID';

-- After deleting, you may also want to reset donation counts in the donors table
-- This will set all donation_count to 0 and last_donation_date to NULL

-- Reset donation counts for all hospital-managed donors
UPDATE public.donors
SET 
  donation_count = 0,
  last_donation_date = NULL;

-- Note: The database triggers will automatically update these counts
-- when new donations are recorded, so this is optional but helps ensure
-- a clean state if you're starting fresh.

