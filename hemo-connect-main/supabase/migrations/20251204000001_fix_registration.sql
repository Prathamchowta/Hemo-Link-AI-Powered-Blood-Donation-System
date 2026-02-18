-- Fix registration by creating a secure function to handle profile and role creation
-- This function can be called during signup even if email confirmation is required

-- Create a function to create user profile and role
-- This function uses SECURITY DEFINER to bypass RLS during signup
CREATE OR REPLACE FUNCTION public.create_user_profile_and_role(
  p_user_id UUID,
  p_full_name TEXT,
  p_phone TEXT,
  p_role app_role,
  p_blood_group TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_hospital_name TEXT DEFAULT NULL,
  p_hospital_address TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (
    id,
    full_name,
    phone,
    blood_group,
    location,
    hospital_name,
    hospital_address
  ) VALUES (
    p_user_id,
    p_full_name,
    p_phone,
    p_blood_group,
    p_location,
    p_hospital_name,
    p_hospital_address
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    blood_group = COALESCE(EXCLUDED.blood_group, profiles.blood_group),
    location = COALESCE(EXCLUDED.location, profiles.location),
    hospital_name = COALESCE(EXCLUDED.hospital_name, profiles.hospital_name),
    hospital_address = COALESCE(EXCLUDED.hospital_address, profiles.hospital_address);

  -- Insert role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, p_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Grant execute permission to authenticated users (and anon for signup)
GRANT EXECUTE ON FUNCTION public.create_user_profile_and_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile_and_role TO anon;

-- Update RLS policies to ensure they work for authenticated users
-- Keep existing policies but ensure they're correct
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own role during signup" ON public.user_roles;
CREATE POLICY "Users can insert their own role during signup"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

