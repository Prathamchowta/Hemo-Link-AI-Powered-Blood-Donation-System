-- Update RLS policy to allow hospitals to view all donations for registered donor users
-- This ensures that when a registered donor donates at one hospital, all hospitals can see that donation

-- Drop the existing policies (both old and new names, in case they exist)
DROP POLICY IF EXISTS "Hospitals can view their donations" ON public.donations;
DROP POLICY IF EXISTS "Hospitals can view their donations and registered donor donations" ON public.donations;

-- Create a new policy that allows hospitals to:
-- 1. View donations recorded at their own hospital (hospital_id = auth.uid())
-- 2. View donations for registered donor users (donor_user_id IS NOT NULL) - allows cross-hospital visibility
-- 3. Admins can view all donations
CREATE POLICY "Hospitals can view their donations and registered donor donations"
ON public.donations FOR SELECT
TO authenticated
USING (
  -- Hospitals can view donations recorded at their hospital
  hospital_id = auth.uid() OR
  -- Hospitals can view donations for registered donor users (cross-hospital visibility)
  (donor_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'hospital'
  )) OR
  -- Admins can view all donations
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

