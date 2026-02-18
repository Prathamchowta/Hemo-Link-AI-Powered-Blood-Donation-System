import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, UserPlus, Award } from "lucide-react";
import { RecordDonation } from "./RecordDonation";
import { DonorCertificates } from "./DonorCertificates";

interface Donor {
  id: string;
  full_name: string;
  blood_group: string;
  phone: string;
  email: string | null;
  location: string;
  last_donation_date: string | null;
  donation_count: number;
  user_id?: string | null;
  hospital_id?: string | null;
}

export const DonorManagement = () => {
  const { toast } = useToast();
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCertificatesDialogOpen, setIsCertificatesDialogOpen] = useState(false);
  const [selectedDonorForCertificates, setSelectedDonorForCertificates] = useState<Donor | null>(null);
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    full_name: "",
    blood_group: "",
    phone: "",
    email: "",
    location: "",
  });

  useEffect(() => {
    fetchDonors();
  }, []);

  const fetchDonors = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log(`🔍 Current hospital user ID: ${user.id}`);
      console.log(`🔍 Fetching donors for hospital: ${user.id}`);

      // Fetch hospital-managed donors
      const { data: hospitalDonors, error: hospitalError } = await supabase
        .from("donors")
        .select("*")
        .eq("hospital_id", user.id)
        .order("created_at", { ascending: false });

      if (hospitalError) throw hospitalError;

      // Update donation stats for hospital-managed donors that have user_id (linked registered donors)
      // This ensures cross-hospital donations are reflected
      const hospitalDonorsWithStats = await Promise.all(
        (hospitalDonors || []).map(async (donor: any) => {
          // If this donor has a user_id, fetch donations from donations table (cross-hospital)
          if (donor.user_id) {
            console.log(`\n🔄 Updating stats for linked donor: ${donor.full_name} (user_id: ${donor.user_id})`);
            
            const { data: donations, error: donationsError } = await (supabase.from as any)("donations")
              .select("donation_date")
              .eq("donor_user_id", donor.user_id)
              .order("donation_date", { ascending: false });

            if (donationsError) {
              console.error(`Error fetching donations for ${donor.full_name}:`, donationsError);
            }

            const { count: donationCount, error: countError } = await (supabase.from as any)("donations")
              .select("*", { count: "exact", head: true })
              .eq("donor_user_id", donor.user_id);

            if (countError) {
              console.error(`Error counting donations for ${donor.full_name}:`, countError);
            }

            const lastDonationDate = donations && donations.length > 0 
              ? donations[0].donation_date 
              : null;

            if (donations && donations.length > 0) {
              console.log(`✅ Found ${donations.length} donations for ${donor.full_name} (cross-hospital)`);
            }

            // Return updated donor with correct stats from donations table
            return {
              ...donor,
              donation_count: donationCount || 0,
              last_donation_date: lastDonationDate,
            };
          }
          // If no user_id, return donor as-is (hospital-managed only)
          return donor;
        })
      );

      // Fetch registered donor users via secure function
      const { data: registeredProfiles, error: registeredError } = await (supabase.rpc as any)("get_registered_donors");

      let registeredDonors: Donor[] = [];
      if (registeredError) {
        console.error("Error fetching registered donors:", registeredError);
      } else if (registeredProfiles) {
        const existingDonorIds = (hospitalDonorsWithStats || [])
          .map((d: any) => d.user_id)
          .filter(Boolean);

        // Filter registered profiles (exclude those already linked to this hospital)
        const filteredProfiles = registeredProfiles
          .filter((profile: any) => profile.blood_group)
          .filter((profile: any) => !existingDonorIds.includes(profile.id));

        console.log(`📋 Found ${filteredProfiles.length} unlinked registered donors to process`);

        // Fetch donation stats for each registered donor from donations table
        registeredDonors = await Promise.all(
          filteredProfiles.map(async (profile: any) => {
            // Query donations table directly for this registered donor user
            // This will get donations from ALL hospitals (thanks to the RLS policy update)
            console.log(`\n🔎 Fetching donations for registered donor: ${profile.full_name}`);
            console.log(`   User ID: ${profile.id}`);
            console.log(`   Current hospital ID: ${user.id}`);
            
            const { data: donations, error: donationsError } = await (supabase.from as any)("donations")
              .select("donation_date, hospital_id, id")
              .eq("donor_user_id", profile.id)
              .order("donation_date", { ascending: false });

            if (donationsError) {
              console.error(`Error fetching donations for ${profile.full_name}:`, donationsError);
              console.error(`Error details:`, JSON.stringify(donationsError, null, 2));
            } else {
              console.log(`Query result for ${profile.full_name}:`, {
                donationsFound: donations?.length || 0,
                donations: donations
              });
            }

            // Count total donations
            const { count: donationCount, error: countError } = await (supabase.from as any)("donations")
              .select("*", { count: "exact", head: true })
              .eq("donor_user_id", profile.id);

            if (countError) {
              console.error(`Error counting donations for ${profile.full_name}:`, countError);
            } else {
              console.log(`Donation count for ${profile.full_name}:`, donationCount);
            }

            // Get last donation date
            const lastDonationDate = donations && donations.length > 0 
              ? donations[0].donation_date 
              : null;

            // Log for debugging
            if (donations && donations.length > 0) {
              console.log(`✅ Found ${donations.length} donations for ${profile.full_name} (${profile.id})`);
              console.log(`   Last donation: ${lastDonationDate}`);
            } else {
              console.log(`⚠️ No donations found for ${profile.full_name} (${profile.id})`);
            }

            return {
              id: profile.id,
              full_name: profile.full_name,
              blood_group: profile.blood_group || "",
              phone: profile.phone,
              email: null,
              location: profile.location || "",
              last_donation_date: lastDonationDate,
              donation_count: donationCount || 0,
              user_id: profile.id,
              hospital_id: null,
            };
          })
        );
      }

      // Combine both lists (use updated hospitalDonorsWithStats instead of hospitalDonors)
      setDonors([...(hospitalDonorsWithStats || []), ...registeredDonors]);
    } catch (error: any) {
      toast({
        title: "Error fetching donors",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const linkRegisteredDonor = async (donor: Donor) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !donor.user_id) return;

      const { error } = await supabase
        .from("donors")
        .insert({
          hospital_id: user.id,
          user_id: donor.user_id,
          full_name: donor.full_name,
          blood_group: donor.blood_group,
          phone: donor.phone,
          location: donor.location,
          email: donor.email,
          donation_count: donor.donation_count,
          last_donation_date: donor.last_donation_date,
        });

      if (error) throw error;

      toast({
        title: "Donor added to your roster",
        description: `${donor.full_name} can now be managed by your hospital.`,
      });
      fetchDonors();
    } catch (error: any) {
      toast({
        title: "Error linking donor",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingDonor) {
        // Update existing donor
        const { error } = await supabase
          .from("donors")
          .update(formData)
          .eq("id", editingDonor.id);

        if (error) throw error;
        toast({ title: "Donor updated successfully" });
      } else {
        // Create new donor
        const { error } = await supabase
          .from("donors")
          .insert({ ...formData, hospital_id: user.id });

        if (error) throw error;
        toast({ title: "Donor added successfully" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchDonors();
    } catch (error: any) {
      toast({
        title: "Error saving donor",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this donor? This action cannot be undone.")) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to delete a donor.",
          variant: "destructive",
        });
        return;
      }

      // First check if donor belongs to this hospital
      const { data: donor, error: checkError } = await supabase
        .from("donors")
        .select("hospital_id")
        .eq("id", id)
        .single();

      if (checkError) throw checkError;

      if (!donor || donor.hospital_id !== user.id) {
        toast({
          title: "Error",
          description: "You can only delete donors managed by your hospital.",
          variant: "destructive",
        });
        return;
      }

      // Delete the donor
      const { data: deletedData, error } = await supabase
        .from("donors")
        .delete()
        .eq("id", id)
        .eq("hospital_id", user.id)
        .select();

      if (error) throw error;

      // Verify the donor was actually deleted
      if (!deletedData || deletedData.length === 0) {
        throw new Error("Donor not found or you don't have permission to delete it");
      }

      toast({ 
        title: "Donor deleted successfully",
        description: "The donor has been removed from your roster.",
      });
      fetchDonors();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Error deleting donor",
        description: error.message || "Failed to delete donor. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (donor: Donor) => {
    setEditingDonor(donor);
    setFormData({
      full_name: donor.full_name,
      blood_group: donor.blood_group,
      phone: donor.phone,
      email: donor.email || "",
      location: donor.location,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ full_name: "", blood_group: "", phone: "", email: "", location: "" });
    setEditingDonor(null);
  };

  const filteredDonors = donors.filter((donor) =>
    donor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    donor.blood_group.toLowerCase().includes(searchTerm.toLowerCase()) ||
    donor.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="animate-pulse">Loading donors...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <Input
          placeholder="Search donors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button
          variant="outline"
          onClick={() => {
            setLoading(true);
            fetchDonors();
          }}
        >
          Refresh
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Donor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDonor ? "Edit Donor" : "Add New Donor"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blood_group">Blood Group</Label>
                <Select
                  value={formData.blood_group}
                  onValueChange={(value) => setFormData({ ...formData, blood_group: value })}
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
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (for alerts)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Optional - for email alerts"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingDonor ? "Update Donor" : "Add Donor"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Blood Group</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Donations</TableHead>
              <TableHead>Last Donation</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDonors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No donors found. Add your first donor to get started.
                </TableCell>
              </TableRow>
            ) : (
              filteredDonors.map((donor) => (
                <TableRow key={donor.id}>
                  <TableCell className="font-medium">{donor.full_name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {donor.blood_group}
                    </span>
                  </TableCell>
                  <TableCell>{donor.phone}</TableCell>
                  <TableCell className="text-muted-foreground">{donor.email || '-'}</TableCell>
                  <TableCell>{donor.location}</TableCell>
                  <TableCell>{donor.donation_count}</TableCell>
                  <TableCell>
                    {donor.last_donation_date
                      ? new Date(donor.last_donation_date).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedDonorForCertificates(donor);
                          setIsCertificatesDialogOpen(true);
                        }}
                        className="gap-2"
                      >
                        <Award className="h-4 w-4" />
                        Certificates
                      </Button>
                      <RecordDonation
                        donorId={donor.hospital_id ? donor.id : undefined}
                        donorUserId={donor.user_id}
                        donorName={donor.full_name}
                        bloodGroup={donor.blood_group}
                        onSuccess={fetchDonors}
                      />
                      {donor.hospital_id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(donor)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(donor.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      ) : (
                        donor.user_id && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => linkRegisteredDonor(donor)}
                          >
                            Add to My Donors
                          </Button>
                        )
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Certificates Dialog */}
      <Dialog open={isCertificatesDialogOpen} onOpenChange={setIsCertificatesDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Donation Certificates</DialogTitle>
          </DialogHeader>
          {selectedDonorForCertificates && (
            <DonorCertificates
              donorId={selectedDonorForCertificates.hospital_id ? selectedDonorForCertificates.id : undefined}
              donorUserId={selectedDonorForCertificates.user_id || undefined}
              donorName={selectedDonorForCertificates.full_name}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
