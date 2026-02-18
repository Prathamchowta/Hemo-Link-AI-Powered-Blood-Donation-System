import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Clock, CheckCircle, XCircle, Building2, Trash2 } from "lucide-react";
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
  hospital_name?: string;
}

export const AdminRequestManagement = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      // Fetch all blood requests across all hospitals
      const { data: allRequests, error } = await supabase
        .from("blood_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch hospital profiles
      const hospitalIds = [...new Set((allRequests || []).map((req: any) => req.hospital_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, hospital_name, full_name")
        .in("id", hospitalIds);

      // Create hospital name map
      const hospitalMap = new Map(
        (profiles || []).map((p: any) => [p.id, p.hospital_name || p.full_name || "Unknown Hospital"])
      );

      // Transform data to include hospital name
      const requestsWithHospital = (allRequests || []).map((request: any) => ({
        ...request,
        hospital_name: hospitalMap.get(request.hospital_id) || "Unknown Hospital",
      }));

      setRequests(requestsWithHospital);
    } catch (error: any) {
      toast({
        title: "Error fetching requests",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("blood_requests")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      toast({ title: `Request marked as ${status}` });
      fetchRequests();
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (id: string) => {
    setRequestToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!requestToDelete) return;

    try {
      const { error } = await supabase
        .from("blood_requests")
        .delete()
        .eq("id", requestToDelete);

      if (error) throw error;

      // Verify the request was actually deleted by checking if it still exists
      const { data: verifyRequest, error: verifyError } = await supabase
        .from("blood_requests")
        .select("id")
        .eq("id", requestToDelete)
        .single();

      // If we can still find the request, deletion failed
      if (!verifyError && verifyRequest) {
        throw new Error("Request could not be deleted. You may not have permission to delete it.");
      }

      toast({
        title: "Request deleted",
        description: "Blood request has been deleted successfully.",
      });

      setDeleteDialogOpen(false);
      setRequestToDelete(null);
      fetchRequests();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Error deleting request",
        description: error.message || "Failed to delete request. Please try again.",
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
      setRequestToDelete(null);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "alert_sent": return <AlertCircle className="h-4 w-4 text-warning" />;
      case "fulfilled": return <CheckCircle className="h-4 w-4 text-success" />;
      case "rejected": return <XCircle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  };

  const filteredRequests = requests.filter((request) =>
    request.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.blood_group.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.hospital_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="animate-pulse">Loading system-wide requests...</div>;
  }

  return (
    <div className="space-y-4">
      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-xl">
            <AlertCircle className="h-6 w-6" />
            System-Wide Blood Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-6">
            <Input
              placeholder="Search by patient name, blood group, hospital, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md border-2"
            />
          </div>

          <div className="border-2 rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold">Hospital</TableHead>
                  <TableHead className="font-semibold">Blood Group</TableHead>
                  <TableHead className="font-semibold">Units</TableHead>
                  <TableHead className="font-semibold">Urgency</TableHead>
                  <TableHead className="font-semibold">Patient</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {searchTerm ? "No requests match your search." : "No requests found across all hospitals."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{request.hospital_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-red-700">{request.blood_group}</span>
                      </TableCell>
                      <TableCell>{request.units_needed}</TableCell>
                      <TableCell>{getUrgencyBadge(request.urgency_level)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{request.patient_name}</div>
                          <div className="text-muted-foreground">{request.patient_contact}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(request.status)}
                          <span className="capitalize">{request.status.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          {request.status !== "fulfilled" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(request.id, "fulfilled")}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark Fulfilled
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(request.id);
                            }}
                            className="hover:bg-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
          setRequestToDelete(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blood Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this blood request? This action cannot be undone. 
              All associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setRequestToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
