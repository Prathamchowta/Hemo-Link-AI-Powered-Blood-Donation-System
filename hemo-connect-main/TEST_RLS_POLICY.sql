-- Test query to verify RLS policy is working correctly
-- Run this as a hospital user to see if you can view donations for registered donors

-- Replace '7ec0e873-5cf5-4c4c-b40e-4ff7b96acc93' with Pallavi's user_id
-- Replace 'YOUR_HOSPITAL_USER_ID' with your current hospital's user ID

-- Test 1: Check if you can see donations for Pallavi (registered donor)
SELECT 
  id,
  donation_date,
  blood_group,
  units_donated,
  donor_user_id,
  hospital_id,
  CASE 
    WHEN hospital_id = 'YOUR_HOSPITAL_USER_ID' THEN 'Your Hospital'
    ELSE 'Other Hospital'
  END as donation_location
FROM donations
WHERE donor_user_id = '7ec0e873-5cf5-4c4c-b40e-4ff7b96acc93'
ORDER BY donation_date DESC;

-- Test 2: Count donations for Pallavi
SELECT COUNT(*) as total_donations
FROM donations
WHERE donor_user_id = '7ec0e873-5cf5-4c4c-b40e-4ff7b96acc93';

-- Test 3: Get last donation date for Pallavi
SELECT MAX(donation_date) as last_donation_date
FROM donations
WHERE donor_user_id = '7ec0e873-5cf5-4c4c-b40e-4ff7b96acc93';

-- Test 4: Verify RLS policy exists
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'donations' 
AND policyname LIKE '%registered donor%';

