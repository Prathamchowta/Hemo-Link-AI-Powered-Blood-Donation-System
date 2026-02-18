import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Clock, CheckCircle, XCircle, Sparkles, Pencil, Trash2, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BloodRequest {
  id: string;
  blood_group: string;
  units_needed: number;
  urgency_level: string;
  patient_name: string;
  patient_contact: string;
  status: string;
  created_at: string;
}

export const RequestManagement = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSuggestionsDialogOpen, setIsSuggestionsDialogOpen] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [editingRequest, setEditingRequest] = useState<BloodRequest | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    blood_group: "",
    units_needed: 1,
    urgency_level: "normal",
    patient_name: "",
    patient_contact: "",
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("blood_requests")
        .select("*")
        .eq("hospital_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingRequest) {
        // Update existing request
        const { error } = await supabase
          .from("blood_requests")
          .update(formData)
          .eq("id", editingRequest.id);

        if (error) throw error;

        toast({
          title: "Request updated successfully",
          description: "Blood request has been updated.",
        });
      } else {
        // Create new request
        const { data: newRequest, error } = await supabase
          .from("blood_requests")
          .insert({ ...formData, hospital_id: user.id })
          .select()
          .single();

        if (error) throw error;

        // Trigger donor alerts via edge function
        try {
          const { data: alertData, error: alertError } = await supabase.functions.invoke(
            'send-donor-alerts',
            {
              body: { requestId: newRequest.id }
            }
          );

          if (alertError) {
            console.error('Error sending alerts:', alertError);
            toast({
              title: "Request created",
              description: "Request saved but failed to notify donors. Please try again.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Request created successfully",
              description: `${alertData.notified} matching donors have been notified.`,
            });
          }
        } catch (alertError: any) {
          console.error('Error calling alert function:', alertError);
          toast({
            title: "Request created",
            description: "Request saved but donor notification failed.",
            variant: "destructive",
          });
        }
      }

      setIsDialogOpen(false);
      setEditingRequest(null);
      setFormData({
        blood_group: "",
        units_needed: 1,
        urgency_level: "normal",
        patient_name: "",
        patient_contact: "",
      });
      fetchRequests();
    } catch (error: any) {
      toast({
        title: editingRequest ? "Error updating request" : "Error creating request",
        description: error.message,
        variant: "destructive",
      });
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

  const handleEdit = (request: BloodRequest) => {
    setEditingRequest(request);
    setFormData({
      blood_group: request.blood_group,
      units_needed: request.units_needed,
      urgency_level: request.urgency_level,
      patient_name: request.patient_name,
      patient_contact: request.patient_contact,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setRequestToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!requestToDelete) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to delete a request.",
          variant: "destructive",
        });
        setDeleteDialogOpen(false);
        setRequestToDelete(null);
        return;
      }

      // First check if request belongs to this hospital
      const { data: request, error: checkError } = await supabase
        .from("blood_requests")
        .select("hospital_id")
        .eq("id", requestToDelete)
        .single();

      if (checkError) throw checkError;

      if (!request || request.hospital_id !== user.id) {
        toast({
          title: "Error",
          description: "You can only delete requests created by your hospital.",
          variant: "destructive",
        });
        setDeleteDialogOpen(false);
        setRequestToDelete(null);
        return;
      }

      // Delete the request
      const { error } = await supabase
        .from("blood_requests")
        .delete()
        .eq("id", requestToDelete)
        .eq("hospital_id", user.id);

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

  const resetForm = () => {
    setEditingRequest(null);
    setFormData({
      blood_group: "",
      units_needed: 1,
      urgency_level: "normal",
      patient_name: "",
      patient_contact: "",
    });
  };

  const retryDonorAlert = async (requestId: string) => {
    try {
      toast({
        title: "Resending alerts...",
        description: "Notifying matching donors.",
      });

      const { data: alertData, error: alertError } = await supabase.functions.invoke(
        'send-donor-alerts',
        {
          body: { requestId }
        }
      );

      if (alertError) {
        console.error('Error sending alerts:', alertError);
        toast({
          title: "Failed to send alerts",
          description: alertError.message || "Please check your notification settings and try again.",
          variant: "destructive",
        });
      } else if (alertData && !alertData.success) {
        // Check if response indicates failure
        console.error('Alert function returned error:', alertData);
        toast({
          title: "Failed to send alerts",
          description: alertData.error || alertData.message || "Please check your notification settings and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Alerts sent successfully",
          description: `${alertData?.notified || 0} matching donors have been notified.`,
        });
        fetchRequests();
      }
    } catch (error: any) {
      console.error('Error calling alert function:', error);
      toast({
        title: "Error sending alerts",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getAISuggestions = async (requestId: string) => {
    try {
      setLoadingSuggestions(true);
      setIsSuggestionsDialogOpen(true);
      setSuggestions(null);

      const { data, error } = await supabase.functions.invoke(
        'suggest-donors',
        {
          body: { requestId }
        }
      );

      if (error) {
        console.error('Error getting suggestions:', error);
        toast({
          title: "Failed to get AI suggestions",
          description: "Please try again later.",
          variant: "destructive",
        });
        setIsSuggestionsDialogOpen(false);
      } else {
        setSuggestions(data);
      }
    } catch (error: any) {
      console.error('Error calling suggest-donors function:', error);
      toast({
        title: "Error getting suggestions",
        description: error.message,
        variant: "destructive",
      });
      setIsSuggestionsDialogOpen(false);
    } finally {
      setLoadingSuggestions(false);
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

  // Filter requests based on search term
  const filteredRequests = requests.filter((request) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      request.patient_name.toLowerCase().includes(searchLower) ||
      request.patient_contact.includes(searchTerm) ||
      request.blood_group.toLowerCase().includes(searchLower) ||
      request.status.toLowerCase().includes(searchLower) ||
      request.urgency_level.toLowerCase().includes(searchLower) ||
      request.units_needed.toString().includes(searchTerm)
    );
  });

  if (loading) {
    return <div className="animate-pulse">Loading requests...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <AlertCircle className="mr-2 h-4 w-4" />
              Create Blood Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRequest ? "Edit Blood Request" : "Create Emergency Blood Request"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="blood_group">Blood Group Required</Label>
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
                <Label htmlFor="units_needed">Units Needed</Label>
                <Input
                  id="units_needed"
                  type="number"
                  min="1"
                  value={formData.units_needed}
                  onChange={(e) => setFormData({ ...formData, units_needed: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="urgency">Urgency Level</Label>
                <Select
                  value={formData.urgency_level}
                  onValueChange={(value) => setFormData({ ...formData, urgency_level: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="patient_name">Patient Name</Label>
                <Input
                  id="patient_name"
                  value={formData.patient_name}
                  onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="patient_contact">Patient Contact</Label>
                <Input
                  id="patient_contact"
                  type="tel"
                  value={formData.patient_contact}
                  onChange={(e) => setFormData({ ...formData, patient_contact: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingRequest ? "Update Request" : "Create Request"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requests by patient name, contact, blood group, status, or urgency..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-2"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Blood Group</TableHead>
              <TableHead>Units</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {searchTerm ? "No requests match your search." : "No requests yet. Create your first blood request to get started."}
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <span className="font-semibold text-primary">{request.blood_group}</span>
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
                      {(request.status === "pending" || request.status === "alert_sent") && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => getAISuggestions(request.id)}
                          >
                            <Sparkles className="mr-2 h-4 w-4" />
                            AI Match
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => retryDonorAlert(request.id)}
                          >
                            <AlertCircle className="mr-2 h-4 w-4" />
                            Resend Alert
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(request)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
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

      <Dialog open={isSuggestionsDialogOpen} onOpenChange={setIsSuggestionsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI-Powered Donor Matching
            </DialogTitle>
            <DialogDescription>
              Our AI analyzes donor eligibility, location, and donation history to suggest the best matches.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {loadingSuggestions ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-pulse text-center">
                  <Sparkles className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-muted-foreground">Analyzing donors...</p>
                </div>
              </div>
            ) : suggestions ? (
              <div className="space-y-4">
                {suggestions.suggestions && suggestions.suggestions.length > 0 ? (
                  <>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-muted-foreground">Total Donors</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold">{suggestions.totalDonors}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-muted-foreground">Eligible</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-success">{suggestions.eligibleDonors}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-muted-foreground">Top Matches</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-primary">{suggestions.suggestions.length}</p>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-semibold">Recommended Donors</h3>
                      {suggestions.suggestions.map((suggestion: any, index: number) => (
                        <Card key={suggestion.id}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                  <Badge variant="outline">#{index + 1}</Badge>
                                  {suggestion.name}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">{suggestion.phone}</p>
                              </div>
                              <Badge className="bg-success text-success-foreground">
                                {suggestion.isEligible ? 'Eligible' : 'Not Eligible'}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Location</p>
                                <p className="font-medium">{suggestion.location}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Donations</p>
                                <p className="font-medium">{suggestion.donationCount} times</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Last Donation</p>
                                <p className="font-medium">{suggestion.daysSinceLastDonation} days ago</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        No eligible donors found for this request.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
