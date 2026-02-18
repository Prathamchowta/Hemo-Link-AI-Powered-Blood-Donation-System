-- Create donors table
CREATE TABLE public.donors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    blood_group TEXT NOT NULL,
    phone TEXT NOT NULL,
    location TEXT NOT NULL,
    last_donation_date DATE,
    donation_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create blood_inventory table
CREATE TABLE public.blood_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blood_group TEXT NOT NULL,
    units_available INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(hospital_id, blood_group)
);

-- Create blood_requests table
CREATE TABLE public.blood_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blood_group TEXT NOT NULL,
    units_needed INTEGER NOT NULL,
    urgency_level TEXT NOT NULL CHECK (urgency_level IN ('critical', 'urgent', 'normal')),
    patient_name TEXT NOT NULL,
    patient_contact TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'alert_sent', 'fulfilled', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for donors
CREATE POLICY "Hospitals can view their own donors"
ON public.donors FOR SELECT
TO authenticated
USING (auth.uid() = hospital_id);

CREATE POLICY "Hospitals can insert their own donors"
ON public.donors FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = hospital_id);

CREATE POLICY "Hospitals can update their own donors"
ON public.donors FOR UPDATE
TO authenticated
USING (auth.uid() = hospital_id);

CREATE POLICY "Hospitals can delete their own donors"
ON public.donors FOR DELETE
TO authenticated
USING (auth.uid() = hospital_id);

-- RLS Policies for blood_inventory
CREATE POLICY "Hospitals can view their own inventory"
ON public.blood_inventory FOR SELECT
TO authenticated
USING (auth.uid() = hospital_id);

CREATE POLICY "Hospitals can insert their own inventory"
ON public.blood_inventory FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = hospital_id);

CREATE POLICY "Hospitals can update their own inventory"
ON public.blood_inventory FOR UPDATE
TO authenticated
USING (auth.uid() = hospital_id);

CREATE POLICY "Anyone can view all inventory for emergency purposes"
ON public.blood_inventory FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for blood_requests
CREATE POLICY "Hospitals can view their own requests"
ON public.blood_requests FOR SELECT
TO authenticated
USING (auth.uid() = hospital_id);

CREATE POLICY "Hospitals can create requests"
ON public.blood_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = hospital_id);

CREATE POLICY "Hospitals can update their own requests"
ON public.blood_requests FOR UPDATE
TO authenticated
USING (auth.uid() = hospital_id);

-- Triggers for updated_at
CREATE TRIGGER set_donors_updated_at
BEFORE UPDATE ON public.donors
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_blood_requests_updated_at
BEFORE UPDATE ON public.blood_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Function to initialize blood inventory for a hospital
CREATE OR REPLACE FUNCTION public.initialize_blood_inventory(hospital_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.blood_inventory (hospital_id, blood_group, units_available)
    VALUES 
        (hospital_user_id, 'A+', 0),
        (hospital_user_id, 'A-', 0),
        (hospital_user_id, 'B+', 0),
        (hospital_user_id, 'B-', 0),
        (hospital_user_id, 'AB+', 0),
        (hospital_user_id, 'AB-', 0),
        (hospital_user_id, 'O+', 0),
        (hospital_user_id, 'O-', 0)
    ON CONFLICT (hospital_id, blood_group) DO NOTHING;
END;
$$;