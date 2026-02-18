-- Run this to see which hospital you're currently logged in as
-- This helps verify if you're testing from the same or different hospital

-- Method 1: Check your current user
SELECT 
  auth.uid() as your_current_user_id,
  (SELECT hospital_name FROM profiles WHERE id = auth.uid()) as your_hospital_name,
  (SELECT full_name FROM profiles WHERE id = auth.uid()) as your_hospital_full_name;

-- Method 2: Compare with Pallavi's donations
-- If your_current_user_id matches the hospital_id, you're viewing from the same hospital
SELECT 
  d.donation_date,
  d.hospital_id as donation_hospital_id,
  p.hospital_name as donation_hospital_name,
  CASE 
    WHEN d.hospital_id = auth.uid() THEN '✅ This is YOUR hospital - donations recorded here'
    ELSE '❌ This is ANOTHER hospital - should be visible via RLS policy'
  END as status
FROM donations d
LEFT JOIN profiles p ON p.id = d.hospital_id
WHERE d.donor_user_id = '7ec0e873-5cf5-4c4c-b40e-4ff7b96acc93'
ORDER BY d.donation_date DESC
LIMIT 5;

