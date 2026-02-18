import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Droplet, Users, AlertCircle, Activity, LogOut, Building2, UserCog, FileText, Bell, Key } from "lucide-react";
import { AdminBloodInventory } from "@/components/AdminBloodInventory";
import { AdminRequestManagement } from "@/components/AdminRequestManagement";
import { AdminDonorManagement } from "@/components/AdminDonorManagement";
import { AdminHospitalManagement } from "@/components/AdminHospitalManagement";
import { AdminUserManagement } from "@/components/AdminUserManagement";
import { AdminActivityLogs } from "@/components/AdminActivityLogs";
import { AdminAlertConfiguration } from "@/components/AdminAlertConfiguration";
import { AdminPasswordReset } from "@/components/AdminPasswordReset";
import { useToast } from "@/hooks/use-toast";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalDonors: 0,
    activeRequests: 0,
    bloodUnitsAvailable: 0,
    livesSaved: 0,
    totalHospitals: 0,
  });

  useEffect(() => {
    fetchUserData();
    fetchStats();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchStats = async () => {
    try {
      // Fetch total donors across all hospitals
      const { count: donorsCount } = await supabase
        .from("donors")
        .select("*", { count: "exact", head: true });

      // Fetch active requests across all hospitals
      const { count: requestsCount } = await supabase
        .from("blood_requests")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "alert_sent"]);

      // Fetch blood inventory total across all hospitals
      const { data: inventory } = await supabase
        .from("blood_inventory")
        .select("units_available");

      const totalUnits = inventory?.reduce((sum, item) => sum + item.units_available, 0) || 0;

      // Calculate lives saved (each donation can save up to 3 lives) across all hospitals
      const { data: donors } = await supabase
        .from("donors")
        .select("donation_count");

      const totalDonations = donors?.reduce((sum, donor) => sum + donor.donation_count, 0) || 0;

      // Count total hospitals (users with hospital role)
      const { data: hospitals } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "hospital");

      setStats({
        totalDonors: donorsCount || 0,
        activeRequests: requestsCount || 0,
        bloodUnitsAvailable: totalUnits,
        livesSaved: totalDonations * 3,
        totalHospitals: hospitals?.length || 0,
      });
    } catch (error: any) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logged out successfully" });
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header with Red Gradient */}
      <header className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-2 border-white/30">
                <Droplet className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">HEMO LINK</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                    Government Service Portal
                  </span>
                  <span className="text-sm opacity-80">•</span>
                  <span className="text-sm font-semibold">System Administrator</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="bg-white/10 hover:bg-white/20 border-white/30 text-white backdrop-blur-sm"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-2">
            System Administration Dashboard
          </h2>
          <p className="text-lg text-gray-600">
            Manage hospitals, donors, blood inventory, and requests across the entire system
          </p>
        </div>

        {/* Stats Overview - Enhanced Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="border-2 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Total Hospitals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-700 mb-1">{stats.totalHospitals}</div>
              <p className="text-xs text-blue-600 font-medium">Registered hospitals</p>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-purple-700 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Total Donors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-purple-700 mb-1">{stats.totalDonors}</div>
              <p className="text-xs text-purple-600 font-medium">Across all hospitals</p>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Active Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-orange-700 mb-1">{stats.activeRequests}</div>
              <p className="text-xs text-orange-600 font-medium">Pending requests</p>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-red-700 flex items-center gap-2">
                <Droplet className="h-5 w-5" />
                Blood Units
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-red-700 mb-1">{stats.bloodUnitsAvailable}</div>
              <p className="text-xs text-red-600 font-medium">System-wide inventory</p>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-green-700 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Lives Saved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-700 mb-1">{stats.livesSaved}</div>
              <p className="text-xs text-green-600 font-medium">Through donations</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="hospitals" className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 bg-white border-2 shadow-md p-1 h-auto">
            <TabsTrigger value="hospitals" className="data-[state=active]:bg-red-600 data-[state=active]:text-white font-semibold py-3">
              <Building2 className="h-4 w-4 mr-2" />
              Hospitals
            </TabsTrigger>
            <TabsTrigger value="inventory" className="data-[state=active]:bg-red-600 data-[state=active]:text-white font-semibold py-3">
              <Droplet className="h-4 w-4 mr-2" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="requests" className="data-[state=active]:bg-red-600 data-[state=active]:text-white font-semibold py-3">
              <AlertCircle className="h-4 w-4 mr-2" />
              Requests
            </TabsTrigger>
            <TabsTrigger value="donors" className="data-[state=active]:bg-red-600 data-[state=active]:text-white font-semibold py-3">
              <Users className="h-4 w-4 mr-2" />
              Donors
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-red-600 data-[state=active]:text-white font-semibold py-3">
              <UserCog className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-red-600 data-[state=active]:text-white font-semibold py-3">
              <FileText className="h-4 w-4 mr-2" />
              Activity Logs
            </TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-red-600 data-[state=active]:text-white font-semibold py-3">
              <Bell className="h-4 w-4 mr-2" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-red-600 data-[state=active]:text-white font-semibold py-3">
              <Key className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hospitals" className="space-y-4">
            <AdminHospitalManagement />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <AdminBloodInventory />
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <AdminRequestManagement />
          </TabsContent>

          <TabsContent value="donors" className="space-y-4">
            <AdminDonorManagement />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <AdminUserManagement />
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <AdminActivityLogs />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <AdminAlertConfiguration />
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <AdminPasswordReset />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
