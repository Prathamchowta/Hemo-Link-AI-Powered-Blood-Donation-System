-- ============================================
-- ADMIN USER SETUP SCRIPT
-- ============================================
-- This script helps you create an admin user for HEMO LINK
-- 
-- IMPORTANT: Before running this script:
-- 1. First create the user in Supabase Dashboard -> Authentication -> Users
-- 2. Copy the User UID from the created user
-- 3. Replace <USER_ID_HERE> below with the actual User UID
-- 4. Replace <ADMIN_EMAIL> with the admin email
-- 5. Replace <ADMIN_NAME> with the admin's full name
-- 6. Replace <ADMIN_PHONE> with the admin's phone number
--
-- ============================================

-- Step 1: Assign admin role to the user
-- Replace <USER_ID_HERE> with the actual User UID from Supabase Auth
INSERT INTO public.user_roles (user_id, role)
VALUES ('<USER_ID_HERE>', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 2: Create admin profile
-- Replace the placeholders with actual values
INSERT INTO public.profiles (id, full_name, phone)
VALUES (
  '<USER_ID_HERE>',           -- Same User UID from Step 1
  '<ADMIN_NAME>',             -- e.g., 'System Administrator'
  '<ADMIN_PHONE>'             -- e.g., '+911234567890'
)
ON CONFLICT (id) DO UPDATE
SET 
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify admin role was assigned
SELECT 
  ur.user_id,
  ur.role,
  p.full_name,
  p.phone,
  au.email
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.id = ur.user_id
LEFT JOIN auth.users au ON au.id = ur.user_id
WHERE ur.role = 'admin';

-- Check all admin users
SELECT 
  ur.id as role_id,
  ur.user_id,
  ur.role,
  ur.created_at as role_created_at,
  p.full_name,
  p.phone,
  au.email,
  au.created_at as user_created_at
FROM public.user_roles ur
JOIN auth.users au ON au.id = ur.user_id
LEFT JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role = 'admin'
ORDER BY ur.created_at DESC;

-- ============================================
-- USAGE EXAMPLE
-- ============================================
-- Example: Creating admin user with UID '123e4567-e89b-12d3-a456-426614174000'
--
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('123e4567-e89b-12d3-a456-426614174000', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;
--
-- INSERT INTO public.profiles (id, full_name, phone)
-- VALUES (
--   '123e4567-e89b-12d3-a456-426614174000',
--   'System Administrator',
--   '+911234567890'
-- )
-- ON CONFLICT (id) DO UPDATE
-- SET 
--   full_name = EXCLUDED.full_name,
--   phone = EXCLUDED.phone;

