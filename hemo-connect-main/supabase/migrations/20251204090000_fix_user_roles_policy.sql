-- Fix recursion in user_roles policy for admin access
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;

CREATE POLICY "Admins can view all user roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin')
);

