import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Award, Download, Calendar, Droplet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Donation {
  id: string;
  donor_id: string | null;
  donor_user_id: string | null;
  blood_group: string;
  donation_date: string;
  units_donated: number;
  certificate_generated: boolean;
  certificate_url: string | null;
  donor_name?: string;
  hospital_name?: string;
  hospital_id?: string;
}

interface DonorCertificatesProps {
  donorId?: string;
  donorUserId?: string;
  donorName?: string;
}

export const DonorCertificates = ({ donorId, donorUserId, donorName }: DonorCertificatesProps) => {
  const { toast } = useToast();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDonations();
  }, [donorId, donorUserId]);

  const fetchDonations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = (supabase.from as any)("donations")
        .select("*")
        .order("donation_date", { ascending: false });

      if (donorId) {
        // For hospital-managed donors, filter by both donor_id and hospital_id
        // (hospital-managed donors are specific to each hospital)
        query = query.eq("donor_id", donorId).eq("hospital_id", user.id);
      } else if (donorUserId) {
        // For registered donor users, show ALL donations across all hospitals
        // Don't filter by hospital_id - this allows cross-hospital visibility
        query = query.eq("donor_user_id", donorUserId);
      } else {
        // If neither donorId nor donorUserId is provided, fall back to hospital-specific
        query = query.eq("hospital_id", user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch donor names and hospital names
      const donationsWithNames = await Promise.all(
        (data || []).map(async (donation: any) => {
          let name = donorName || "Unknown Donor";

          if (donation.donor_id) {
            const { data: donor } = await supabase
              .from("donors")
              .select("full_name")
              .eq("id", donation.donor_id)
              .single();
            if (donor) name = donor.full_name;
          } else if (donation.donor_user_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", donation.donor_user_id)
              .single();
            if (profile) name = profile.full_name;
          }

          // Fetch hospital name for this donation
          let hospitalName = "Unknown Hospital";
          if (donation.hospital_id) {
            const { data: hospitalProfile } = await supabase
              .from("profiles")
              .select("hospital_name, full_name")
              .eq("id", donation.hospital_id)
              .single();
            if (hospitalProfile) {
              hospitalName = hospitalProfile.hospital_name || hospitalProfile.full_name || "Unknown Hospital";
            }
          }

          return {
            ...donation,
            donor_name: name,
            hospital_name: hospitalName,
          };
        })
      );

      setDonations(donationsWithNames);
    } catch (error: any) {
      console.error("Error fetching donations:", error);
      toast({
        title: "Error",
        description: "Failed to load donation certificates.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCertificate = async (certificateUrl: string, donorName: string, donationDate: string) => {
    try {
      // Fetch the certificate HTML content
      const response = await fetch(certificateUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch certificate');
      }
      
      const htmlContent = await response.text();
      
      // Create a blob with the HTML content
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `Blood_Donation_Certificate_${donorName.replace(/\s+/g, '_')}_${donationDate.replace(/\//g, '-')}.html`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // Also open in new tab for viewing using data URL
      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
      window.open(dataUrl, '_blank');
    } catch (error: any) {
      console.error('Error downloading certificate:', error);
      toast({
        title: "Error",
        description: "Failed to download certificate. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateCertificate = async (donationId: string) => {
    try {
      toast({
        title: "Generating certificate...",
        description: "Please wait while we generate the certificate.",
      });

      const { data, error } = await supabase.functions.invoke("generate-certificate", {
        body: { donationId },
      });

      if (error) {
        console.error("Edge function error:", error);
        // Check if it's a network error or function error
        if (error.message && error.message.includes("non-2xx")) {
          // Try to get more details from the response
          const errorMessage = data?.error || error.message || "Edge function returned an error";
          throw new Error(errorMessage);
        }
        throw error;
      }

      if (data && data.success) {
        toast({
          title: "Certificate generated!",
          description: "The certificate has been generated successfully.",
        });
        fetchDonations(); // Refresh the list
      } else {
        throw new Error(data?.error || "Failed to generate certificate");
      }
    } catch (error: any) {
      console.error("Error generating certificate:", error);
      const errorMessage = error.message || "Failed to generate certificate. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading certificates...</div>;
  }

  if (donations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Donation Certificates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No donations found for this donor.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Donation Certificates
          {donorName && <span className="text-base font-normal text-muted-foreground">- {donorName}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Hospital</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donations.map((donation) => (
                <TableRow key={donation.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(donation.donation_date).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{donation.hospital_name || "Unknown Hospital"}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-semibold">
                      <Droplet className="h-3 w-3 mr-1" />
                      {donation.blood_group}
                    </Badge>
                  </TableCell>
                  <TableCell>{donation.units_donated}</TableCell>
                  <TableCell>
                    {donation.certificate_generated ? (
                      <Badge className="bg-green-500">Generated</Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {donation.certificate_generated && donation.certificate_url ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          handleDownloadCertificate(
                            donation.certificate_url!,
                            donation.donor_name || 'Donor',
                            new Date(donation.donation_date).toLocaleDateString()
                          );
                        }}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateCertificate(donation.id)}
                        className="gap-2"
                      >
                        <Award className="h-4 w-4" />
                        Generate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

