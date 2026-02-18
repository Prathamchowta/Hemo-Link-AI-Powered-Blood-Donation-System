-- Function to create an admin user
-- This function can be called to set up admin credentials
CREATE OR REPLACE FUNCTION public.create_admin_user(
  admin_email TEXT,
  admin_password TEXT,
  admin_name TEXT DEFAULT 'System Administrator'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Create the user in auth.users (this requires admin privileges)
  -- Note: In production, you should use Supabase Admin API or Dashboard to create users
  -- This function is provided for reference and may need to be executed via Supabase Dashboard
  
  -- Insert into profiles table (will be created after auth user is created)
  -- The actual user creation should be done via Supabase Auth API or Dashboard
  
  -- After user is created, assign admin role
  -- This part can be executed after the user is created via Supabase Auth
  
  RETURN new_user_id;
END;
$$;

-- RLS Policy to allow admins to view all user roles (for admin dashboard)
CREATE POLICY "Admins can view all user roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policy to allow admins to view all profiles (for admin dashboard)
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policy to allow admins to view all blood requests
CREATE POLICY "Admins can view all blood requests"
ON public.blood_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policy to allow admins to view all donors
CREATE POLICY "Admins can view all donors"
ON public.donors FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policy to allow admins to view all blood inventory
CREATE POLICY "Admins can view all blood inventory"
ON public.blood_inventory FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Instructions for creating admin user:
-- 1. Use Supabase Dashboard -> Authentication -> Add User
--    OR use Supabase Management API to create user
-- 2. After user is created, run this SQL to assign admin role:
--    INSERT INTO public.user_roles (user_id, role)
--    VALUES ('<user_id_from_auth_users>', 'admin');
-- 3. Create profile for admin:
--    INSERT INTO public.profiles (id, full_name, phone)
--    VALUES ('<user_id_from_auth_users>', 'System Administrator', '+911234567890');

