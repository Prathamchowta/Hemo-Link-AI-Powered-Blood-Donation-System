import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Droplet, User, Heart, AlertCircle, LogOut, MessageCircle, Calendar, MapPin, Phone, Award, Pencil } from "lucide-react";
import { Chatbot } from "@/components/Chatbot";
import { DonationHistory } from "@/components/DonationHistory";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Profile {
  id: string;
  full_name: string;
  phone: string;
  blood_group: string | null;
  location: string | null;
}

interface BloodRequest {
  id: string;
  blood_group: string;
  units_needed: number;
  urgency_level: string;
  patient_name: string;
  patient_contact: string;
  status: string;
  created_at: string;
  hospital_id: string;
}

const DonorDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [availableRequests, setAvailableRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    fetchDonorData();
  }, []);

  const fetchDonorData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);
      
      // Set edit form data with current values
      setEditFormData({
        full_name: profileData.full_name || "",
        phone: profileData.phone || "",
        email: user.email || "",
      });

      // Fetch available blood requests matching donor's blood group
      if (profileData?.blood_group) {
        const { data: requestsData, error: requestsError } = await supabase
          .from("blood_requests")
          .select("*")
          .eq("blood_group", profileData.blood_group)
          .in("status", ["pending", "alert_sent"])
          .order("created_at", { ascending: false });

        if (requestsError) throw requestsError;
        setAvailableRequests(requestsData || []);
      }
    } catch (error: any) {
      console.error("Error fetching donor data:", error);
      toast({
        title: "Error",
        description: "Failed to load your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
          phone: editFormData.phone,
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
        description: "Your profile has been updated.",
      });

      setIsEditDialogOpen(false);
      fetchDonorData();
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    const styles = {
      critical: "bg-destructive text-destructive-foreground",
      urgent: "bg-warning text-warning-foreground",
      normal: "bg-muted text-muted-foreground",
    };
    return <Badge className={styles[urgency as keyof typeof styles]}>{urgency}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

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
                <p className="text-sm text-muted-foreground">Donor Portal</p>
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
                    <DialogTitle>Edit Profile</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleEditProfile} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Full Name</Label>
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
        {/* Profile Overview */}
        {profile && (
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="text-lg font-semibold">{profile.full_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <p className="text-sm">{profile.phone}</p>
                  </div>
                  {profile.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <p className="text-sm">{profile.location}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Droplet className="h-4 w-4" />
                  Blood Group
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {profile.blood_group || "Not set"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Your blood type</p>
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
                <div className="text-3xl font-bold text-warning">
                  {availableRequests.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Matching your blood group</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList>
            <TabsTrigger value="requests">
              <AlertCircle className="h-4 w-4 mr-2" />
              Blood Requests
            </TabsTrigger>
            <TabsTrigger value="donations">
              <Award className="h-4 w-4 mr-2" />
              My Donations
            </TabsTrigger>
            <TabsTrigger value="chatbot">
              <MessageCircle className="h-4 w-4 mr-2" />
              AI Assistant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Available Blood Requests</CardTitle>
                <p className="text-sm text-muted-foreground">
                  These requests match your blood group ({profile?.blood_group || "N/A"})
                </p>
              </CardHeader>
              <CardContent>
                {availableRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No active blood requests matching your blood group at the moment.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      You'll be notified when a request matches your profile.
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Blood Group</TableHead>
                          <TableHead>Units Needed</TableHead>
                          <TableHead>Urgency</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {availableRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell>
                              <span className="font-semibold text-primary">{request.blood_group}</span>
                            </TableCell>
                            <TableCell>{request.units_needed}</TableCell>
                            <TableCell>{getUrgencyBadge(request.urgency_level)}</TableCell>
                            <TableCell>{request.patient_name}</TableCell>
                            <TableCell>
                              <a
                                href={`tel:${request.patient_contact}`}
                                className="text-primary hover:underline"
                              >
                                {request.patient_contact}
                              </a>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">
                                  {new Date(request.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="donations" className="space-y-4">
            <DonationHistory />
          </TabsContent>

          <TabsContent value="chatbot" className="space-y-4">
            <Chatbot />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DonorDashboard;

