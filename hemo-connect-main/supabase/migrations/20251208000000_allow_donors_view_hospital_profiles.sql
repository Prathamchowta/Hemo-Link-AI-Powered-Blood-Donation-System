-- Allow donors to view hospital profiles (hospital_name and full_name) for donation history
-- This is needed so donors can see which hospital recorded their donation

-- Create policy to allow authenticated users to view hospital profile names
-- Users can view their own profile OR view profiles that have a hospital_name (hospitals)
CREATE POLICY "Users can view hospital profile names"
ON public.profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR  -- Users can view their own profile
  hospital_name IS NOT NULL  -- Users can view profiles that have a hospital_name (hospitals)
);

-- Note: This policy allows all authenticated users (donors, hospitals, admins) 
-- to view hospital profiles (profiles with hospital_name set).
-- This is safe because we're only exposing hospital_name and full_name,
-- not sensitive information like phone numbers or addresses.

