-- Run this query to check which hospital you're currently logged in as
-- This will help verify if you're viewing from the same or different hospital

-- Check your current user ID and role
SELECT 
  auth.uid() as current_user_id,
  (SELECT role FROM user_roles WHERE user_id = auth.uid()) as your_role,
  (SELECT hospital_name FROM profiles WHERE id = auth.uid()) as hospital_name;

-- Check all donations for Pallavi and which hospital recorded them
SELECT 
  d.id,
  d.donation_date,
  d.blood_group,
  d.units_donated,
  d.hospital_id,
  p.hospital_name,
  p.full_name as hospital_name_full,
  CASE 
    WHEN d.hospital_id = auth.uid() THEN '✅ YOUR HOSPITAL'
    ELSE '❌ OTHER HOSPITAL'
  END as donation_source
FROM donations d
LEFT JOIN profiles p ON p.id = d.hospital_id
WHERE d.donor_user_id = '7ec0e873-5cf5-4c4c-b40e-4ff7b96acc93'
ORDER BY d.donation_date DESC;

