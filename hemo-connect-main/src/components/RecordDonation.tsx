import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Droplet, Calendar } from "lucide-react";

interface RecordDonationProps {
  donorId?: string;
  donorUserId?: string;
  donorName?: string;
  bloodGroup?: string;
  onSuccess?: () => void;
}

export const RecordDonation = ({ donorId, donorUserId, donorName, bloodGroup, onSuccess }: RecordDonationProps) => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    donor_id: donorId || "",
    donor_user_id: donorUserId || "",
    blood_group: bloodGroup || "",
    donation_date: new Date().toISOString().split("T")[0],
    units_donated: 1,
    notes: "",
  });

  useEffect(() => {
    if (isDialogOpen) {
      setFormData((prev) => ({
        ...prev,
        donor_id: donorId || "",
        donor_user_id: donorUserId || "",
        blood_group: bloodGroup || prev.blood_group || "",
      }));
    }
  }, [isDialogOpen, donorId, donorUserId, bloodGroup]);

  const ensureDonorRecord = async (hospitalId: string) => {
    let targetDonorId = formData.donor_id;

    if (formData.donor_user_id) {
      const { data: existingDonor } = await supabase
        .from("donors")
        .select("id")
        .eq("hospital_id", hospitalId)
        .eq("user_id", formData.donor_user_id)
        .single();

      if (existingDonor) {
        targetDonorId = existingDonor.id;
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", formData.donor_user_id)
          .single();

        if (profile) {
          const { data: insertedDonor, error: insertError } = await supabase
            .from("donors")
            .insert({
              hospital_id: hospitalId,
              user_id: formData.donor_user_id,
              full_name: profile.full_name,
              blood_group: profile.blood_group || formData.blood_group,
              phone: profile.phone,
              location: profile.location || "",
              email: null,
              donation_count: 0,
              last_donation_date: null,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          targetDonorId = insertedDonor.id;
        }
      }
    }

    return targetDonorId;
  };

  // Removed updateDonorStats - donation count is now handled by database trigger
  // The trigger automatically counts donation records and updates last_donation_date

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to record a donation.",
          variant: "destructive",
        });
        return;
      }

      if (!formData.blood_group) {
        toast({
          title: "Blood group required",
          description: "Please select a blood group.",
          variant: "destructive",
        });
        return;
      }

      // Record the donation
      const { data: donation, error } = await (supabase.from as any)("donations")
        .insert({
          donor_id: formData.donor_id || null,
          donor_user_id: formData.donor_user_id || null,
          hospital_id: user.id,
          blood_group: formData.blood_group,
          donation_date: formData.donation_date,
          units_donated: formData.units_donated,
          notes: formData.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Ensure donor record exists (for hospital-managed donors)
      // Note: Donation count is automatically updated by database trigger
      // The trigger counts actual donation records from the donations table
      // No manual update needed - the trigger handles it correctly
      await ensureDonorRecord(user.id);

      // Generate certificate automatically after recording donation
      try {
        const { data: certData, error: certError } = await supabase.functions.invoke(
          'generate-certificate',
          {
            body: { donationId: donation.id }
          }
        );

        if (certError) {
          console.error('Error generating certificate:', certError);
          // Don't fail the donation recording if certificate generation fails
          toast({
            title: "Donation recorded!",
            description: `Successfully recorded ${formData.units_donated} unit(s) of ${formData.blood_group} blood donation. Certificate generation is in progress.`,
          });
        } else {
          toast({
            title: "Donation recorded!",
            description: `Successfully recorded ${formData.units_donated} unit(s) of ${formData.blood_group} blood donation. Certificate has been generated.`,
          });
        }
      } catch (certError: any) {
        console.error('Exception generating certificate:', certError);
        // Don't fail the donation recording if certificate generation fails
        toast({
          title: "Donation recorded!",
          description: `Successfully recorded ${formData.units_donated} unit(s) of ${formData.blood_group} blood donation.`,
        });
      }

      setIsDialogOpen(false);
      setFormData({
        donor_id: "",
        donor_user_id: "",
        blood_group: "",
        donation_date: new Date().toISOString().split("T")[0],
        units_donated: 1,
        notes: "",
      });

      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error recording donation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to record donation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Droplet className="h-4 w-4 mr-2" />
          Record Donation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Blood Donation</DialogTitle>
          <DialogDescription>
            {donorName ? `Recording donation for ${donorName}` : "Record a new blood donation"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="blood_group">Blood Group *</Label>
            <Select
              value={formData.blood_group}
              onValueChange={(value) => setFormData({ ...formData, blood_group: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select blood group" />
              </SelectTrigger>
              <SelectContent>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => (
                  <SelectItem key={group} value={group}>{group}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="donation_date">Donation Date *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="donation_date"
                type="date"
                value={formData.donation_date}
                onChange={(e) => setFormData({ ...formData, donation_date: e.target.value })}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="units_donated">Units Donated *</Label>
            <Input
              id="units_donated"
              type="number"
              min="1"
              max="5"
              value={formData.units_donated}
              onChange={(e) => setFormData({ ...formData, units_donated: parseInt(e.target.value) || 1 })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              type="text"
              placeholder="Any additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Recording..." : "Record Donation"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

