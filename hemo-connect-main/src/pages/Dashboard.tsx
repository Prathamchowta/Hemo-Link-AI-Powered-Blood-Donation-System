import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Droplet, Users, AlertCircle, Activity, LogOut, MessageCircle, Pencil } from "lucide-react";
import { DonorManagement } from "@/components/DonorManagement";
import { BloodInventory } from "@/components/BloodInventory";
import { RequestManagement } from "@/components/RequestManagement";
import { Chatbot } from "@/components/Chatbot";
import { useToast } from "@/hooks/use-toast";

const HospitalDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [hospitalName, setHospitalName] = useState<string>("");
  const [hospitalProfile, setHospitalProfile] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    full_name: "",
    hospital_name: "",
    phone: "",
    email: "",
    hospital_address: "",
  });
  const [stats, setStats] = useState({
    totalDonors: 0,
    activeRequests: 0,
    bloodUnitsAvailable: 0,
    livesSaved: 0,
  });

  useEffect(() => {
    fetchUserData();
    fetchStats();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      // Fetch hospital profile to get hospital name
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (profile) {
        setHospitalProfile(profile);
        setHospitalName(profile.hospital_name || profile.full_name || "");
        
        // Set edit form data with current values
        setEditFormData({
          full_name: profile.full_name || "",
          hospital_name: profile.hospital_name || "",
          phone: profile.phone || "",
          email: user.email || "",
          hospital_address: profile.hospital_address || "",
        });
      }
    }
  };

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch donors count
      const { count: donorsCount } = await supabase
        .from("donors")
        .select("*", { count: "exact", head: true })
        .eq("hospital_id", user.id);

      // Fetch active requests
      const { count: requestsCount } = await supabase
        .from("blood_requests")
        .select("*", { count: "exact", head: true })
        .eq("hospital_id", user.id)
        .in("status", ["pending", "alert_sent"]);

      // Fetch blood inventory total
      const { data: inventory } = await supabase
        .from("blood_inventory")
        .select("units_available")
        .eq("hospital_id", user.id);

      const totalUnits = inventory?.reduce((sum, item) => sum + item.units_available, 0) || 0;

      // Calculate lives saved
      // Each unit of blood can be separated into components (red cells, platelets, plasma)
      // that can help up to 3 different patients, so we multiply units by 1
      // Count only donations recorded at THIS hospital (not cross-hospital)
      const { data: donations, error: donationsError } = await (supabase.from as any)("donations")
        .select("units_donated")
        .eq("hospital_id", user.id);

      if (donationsError) {
        console.error("Error fetching donations for lives saved:", donationsError);
      }

      // Sum all units donated and multiply by 3 (each unit can save up to 3 lives)
      const totalUnitsDonated = donations?.reduce((sum: number, donation: any) => sum + (donation.units_donated || 1), 0) || 0;
      const livesSaved = totalUnitsDonated * 1;

      setStats({
        totalDonors: donorsCount || 0,
        activeRequests: requestsCount || 0,
        bloodUnitsAvailable: totalUnits,
        livesSaved: livesSaved,
      });
    } catch (error: any) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logged out successfully" });
    navigate("/auth");
  };

  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: editFormData.full_name,
          hospital_name: editFormData.hospital_name,
          phone: editFormData.phone,
          hospital_address: editFormData.hospital_address,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Update email if changed
      if (editFormData.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: editFormData.email,
        });

        if (emailError) {
          toast({
            title: "Profile updated",
            description: "Profile updated but email change requires verification. Check your new email.",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Profile updated successfully",
        description: "Your hospital profile has been updated.",
      });

      setIsEditDialogOpen(false);
      fetchUserData();
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Droplet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">HEMO LINK</h1>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Hospital Portal</p>
                  {hospitalName && (
                    <>
                      <span className="text-sm text-muted-foreground">•</span>
                      <p className="text-sm font-medium text-foreground">{hospitalName}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Hospital Profile</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleEditProfile} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-hospital-name">Hospital Name</Label>
                      <Input
                        id="edit-hospital-name"
                        value={editFormData.hospital_name}
                        onChange={(e) => setEditFormData({ ...editFormData, hospital_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Contact Person Name</Label>
                      <Input
                        id="edit-name"
                        value={editFormData.full_name}
                        onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-email">Email</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={editFormData.email}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-phone">Phone Number</Label>
                      <Input
                        id="edit-phone"
                        type="tel"
                        value={editFormData.phone}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-address">Hospital Address</Label>
                      <Input
                        id="edit-address"
                        value={editFormData.hospital_address}
                        onChange={(e) => setEditFormData({ ...editFormData, hospital_address: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Update Profile
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Donors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.totalDonors}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered donors</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Active Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{stats.activeRequests}</div>
              <p className="text-xs text-muted-foreground mt-1">Pending requests</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Droplet className="h-4 w-4" />
                Blood Units
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{stats.bloodUnitsAvailable}</div>
              <p className="text-xs text-muted-foreground mt-1">Units available</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Lives Saved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.livesSaved}</div>
              <p className="text-xs text-muted-foreground mt-1">Through donations</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList>
            <TabsTrigger value="inventory">Blood Inventory</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="donors">Donors</TabsTrigger>
            <TabsTrigger value="chatbot">
              <MessageCircle className="h-4 w-4 mr-2" />
              AI Assistant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-4">
            <BloodInventory />
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <RequestManagement />
          </TabsContent>

          <TabsContent value="donors" className="space-y-4">
            <DonorManagement />
          </TabsContent>

          <TabsContent value="chatbot" className="space-y-4">
            <Chatbot />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default HospitalDashboard;
