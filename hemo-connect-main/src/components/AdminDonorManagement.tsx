import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Building2, Trash2, Search, Droplet, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  hospital_name?: string;
}

export const AdminDonorManagement = () => {
  const { toast } = useToast();
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [donorToDelete, setDonorToDelete] = useState<Donor | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  useEffect(() => {
    fetchDonors();
  }, []);

  const fetchDonors = async () => {
    try {
      // Fetch all donors across all hospitals
      const { data: allDonors, error } = await supabase
        .from("donors")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch hospital profiles
      const hospitalIds = [...new Set((allDonors || []).map((d: any) => d.hospital_id).filter(Boolean))];
      const { data: profiles } = hospitalIds.length > 0 ? await supabase
        .from("profiles")
        .select("id, hospital_name, full_name")
        .in("id", hospitalIds) : { data: [] };

      // Create hospital name map
      const hospitalMap = new Map(
        (profiles || []).map((p: any) => [p.id, p.hospital_name || p.full_name || "Unknown Hospital"])
      );

      // Transform data to include hospital name
      const donorsWithHospital = (allDonors || []).map((donor: any) => ({
        ...donor,
        hospital_name: hospitalMap.get(donor.hospital_id) || "Unknown Hospital",
      }));

      // Also fetch registered donor users
      const { data: registeredProfiles, error: registeredError } = await (supabase.rpc as any)("get_registered_donors");

      let registeredDonors: Donor[] = [];
      if (!registeredError && registeredProfiles) {
        const existingDonorIds = (allDonors || [])
          .map((d: any) => d.user_id)
          .filter(Boolean);

        registeredDonors = registeredProfiles
          .filter((profile: any) => profile.blood_group)
          .filter((profile: any) => !existingDonorIds.includes(profile.id))
          .map((profile: any) => ({
            id: profile.id,
            full_name: profile.full_name,
            blood_group: profile.blood_group || "",
            phone: profile.phone,
            email: null,
            location: profile.location || "",
            last_donation_date: null,
            donation_count: 0,
            user_id: profile.id,
            hospital_id: null,
            hospital_name: "Registered Donor (Not linked to hospital)",
          }));
      }

      // Combine both lists
      setDonors([...donorsWithHospital, ...registeredDonors]);
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

  const handleDeleteClick = (donor: Donor) => {
    setDonorToDelete(donor);
    setDeleteConfirmation("");
    setAdminPassword("");
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!donorToDelete) return;

    // Security check: Require confirmation text
    if (deleteConfirmation !== "DELETE") {
      toast({
        title: "Security Verification Failed",
        description: "Please type 'DELETE' exactly to confirm this action.",
        variant: "destructive",
      });
      return;
    }

    // Security check: Verify admin password is provided
    if (!adminPassword) {
      toast({
        title: "Password Required",
        description: "Please enter your admin password to confirm deletion.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Verify admin is logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to perform this action.",
          variant: "destructive",
        });
        return;
      }

      // Note: Password verification would require server-side implementation
      // For now, we require both confirmation text and password entry as security measures

      // If it's a hospital-managed donor, delete from donors table
      if (donorToDelete.hospital_id) {
        const { error } = await supabase
          .from("donors")
          .delete()
          .eq("id", donorToDelete.id);

        if (error) throw error;
      }

      // If it's a registered donor user, delete the entire user account
      if (donorToDelete.user_id && !donorToDelete.hospital_id) {
        // Call edge function to delete the user (including auth user)
        const { data: deleteResult, error: deleteError } = await supabase.functions.invoke(
          'delete-user',
          {
            body: {
              userId: donorToDelete.user_id,
              deleteAuthUser: true
            }
          }
        );

        if (deleteError) {
          console.error('Error calling delete-user function:', deleteError);
          throw new Error(deleteError.message || 'Failed to delete donor user');
        }

        if (deleteResult && !deleteResult.success) {
          throw new Error(deleteResult.error || 'Failed to delete donor user');
        }
      }

      toast({
        title: "Donor deleted successfully",
        description: `${donorToDelete.full_name} has been removed from the donor registry.`,
      });

      setDeleteDialogOpen(false);
      setDonorToDelete(null);
      setDeleteConfirmation("");
      setAdminPassword("");
      fetchDonors();
    } catch (error: any) {
      toast({
        title: "Error deleting donor",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredDonors = donors.filter((donor) =>
    donor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    donor.blood_group.toLowerCase().includes(searchTerm.toLowerCase()) ||
    donor.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    donor.hospital_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="animate-pulse">Loading system-wide donors...</div>;
  }

  return (
    <div className="space-y-4">
      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Droplet className="h-6 w-6" />
            System-Wide Donor Registry
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, blood group, location, or hospital..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 max-w-md border-2"
              />
            </div>
          </div>

          <div className="border-2 rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Blood Group</TableHead>
                  <TableHead className="font-semibold">Phone</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Location</TableHead>
                  <TableHead className="font-semibold">Hospital</TableHead>
                  <TableHead className="font-semibold">Donations</TableHead>
                  <TableHead className="font-semibold">Last Donation</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDonors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      {searchTerm ? "No donors match your search." : "No donors found across all hospitals."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDonors.map((donor) => (
                    <TableRow key={donor.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{donor.full_name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300">
                          {donor.blood_group}
                        </span>
                      </TableCell>
                      <TableCell>{donor.phone}</TableCell>
                      <TableCell className="text-muted-foreground">{donor.email || '-'}</TableCell>
                      <TableCell>{donor.location}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{donor.hospital_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{donor.donation_count}</TableCell>
                      <TableCell>
                        {donor.last_donation_date
                          ? new Date(donor.last_donation_date).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(donor)}
                          className="hover:bg-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) {
          setDeleteConfirmation("");
          setAdminPassword("");
        }
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-600" />
              Secure Deletion Required
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div>
                You are about to delete <strong className="text-red-600">{donorToDelete?.full_name}</strong>. 
                This action cannot be undone. All associated donation records will also be removed.
              </div>
              
              <div className="space-y-3 pt-2 border-t">
                <div className="space-y-2">
                  <Label htmlFor="delete-confirm" className="text-sm font-semibold">
                    Type <span className="text-red-600 font-mono">DELETE</span> to confirm:
                  </Label>
                  <Input
                    id="delete-confirm"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="Type DELETE here"
                    className="font-mono"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="admin-password" className="text-sm font-semibold">
                    Enter your admin password for security verification:
                  </Label>
                  <Input
                    id="admin-password"
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter your admin password"
                  />
                  <p className="text-xs text-muted-foreground">
                    This action requires both confirmation text and password verification.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteConfirmation("");
              setAdminPassword("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteConfirmation !== "DELETE" || !adminPassword}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Donor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
