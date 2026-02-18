-- Create donations table to track individual donations
CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID, -- Can be from donors table (hospital-managed) or profiles (registered users)
    donor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- For registered donor users
    hospital_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blood_group TEXT NOT NULL,
    donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    units_donated INTEGER DEFAULT 1,
    certificate_generated BOOLEAN DEFAULT false,
    certificate_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add foreign key for hospital-managed donors (optional)
ALTER TABLE public.donations 
ADD CONSTRAINT fk_donor_id FOREIGN KEY (donor_id) 
REFERENCES public.donors(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_donations_donor_user_id ON public.donations(donor_user_id);
CREATE INDEX IF NOT EXISTS idx_donations_hospital_id ON public.donations(hospital_id);
CREATE INDEX IF NOT EXISTS idx_donations_donation_date ON public.donations(donation_date);

-- Enable RLS
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for donations
-- Donors can view their own donations
CREATE POLICY "Donors can view their own donations"
ON public.donations FOR SELECT
TO authenticated
USING (
  donor_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND id = donations.donor_user_id
  )
);

-- Hospitals can view donations at their hospital
CREATE POLICY "Hospitals can view their donations"
ON public.donations FOR SELECT
TO authenticated
USING (
  hospital_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Hospitals can insert donations
CREATE POLICY "Hospitals can insert donations"
ON public.donations FOR INSERT
TO authenticated
WITH CHECK (
  hospital_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Hospitals can update donations
CREATE POLICY "Hospitals can update their donations"
ON public.donations FOR UPDATE
TO authenticated
USING (
  hospital_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Function to update donation count and last donation date
CREATE OR REPLACE FUNCTION public.update_donor_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update hospital-managed donor stats
  IF NEW.donor_id IS NOT NULL THEN
    UPDATE public.donors
    SET 
      donation_count = (
        SELECT COUNT(*) FROM public.donations
        WHERE donor_id = NEW.donor_id
      ),
      last_donation_date = NEW.donation_date
    WHERE id = NEW.donor_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update donor stats after donation
CREATE TRIGGER update_donor_stats_trigger
AFTER INSERT ON public.donations
FOR EACH ROW
EXECUTE FUNCTION public.update_donor_stats();

-- Function to update blood inventory after donation
CREATE OR REPLACE FUNCTION public.update_blood_inventory_on_donation()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment blood inventory for the hospital
  INSERT INTO public.blood_inventory (hospital_id, blood_group, units_available)
  VALUES (NEW.hospital_id, NEW.blood_group, NEW.units_donated)
  ON CONFLICT (hospital_id, blood_group)
  DO UPDATE SET
    units_available = blood_inventory.units_available + NEW.units_donated,
    last_updated = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update inventory
CREATE TRIGGER update_inventory_on_donation
AFTER INSERT ON public.donations
FOR EACH ROW
EXECUTE FUNCTION public.update_blood_inventory_on_donation();

-- Add user_id field to donors table to link registered users
ALTER TABLE public.donors 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for linking
CREATE INDEX IF NOT EXISTS idx_donors_user_id ON public.donors(user_id);

-- Update RLS to allow hospitals to see registered donors
-- Registered donors (from profiles) should be visible to hospitals
-- We'll handle this in the application by creating donor records for registered users

