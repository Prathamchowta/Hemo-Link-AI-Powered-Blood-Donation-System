-- Helper function to expose registered donors (role = 'donor') to hospitals
CREATE OR REPLACE FUNCTION public.get_registered_donors()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  phone TEXT,
  blood_group TEXT,
  location TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.full_name,
    p.phone,
    p.blood_group,
    p.location
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE ur.role = 'donor'
$$;

GRANT EXECUTE ON FUNCTION public.get_registered_donors TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_registered_donors TO service_role;

