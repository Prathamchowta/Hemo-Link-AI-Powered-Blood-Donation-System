-- Add DELETE policy for blood_requests table
-- This allows hospitals to delete their own blood requests

CREATE POLICY "Hospitals can delete their own requests"
ON public.blood_requests FOR DELETE
TO authenticated
USING (auth.uid() = hospital_id);

-- Also add DELETE policy for admins to delete any request
CREATE POLICY "Admins can delete any blood request"
ON public.blood_requests FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

