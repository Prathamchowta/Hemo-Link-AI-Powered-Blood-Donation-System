import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, MapPin, Droplet, Download, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Donation {
  id: string;
  hospital_id: string;
  blood_group: string;
  donation_date: string;
  units_donated: number;
  hospital_name: string | null;
  created_at: string;
  certificate_generated?: boolean;
  certificate_url?: string;
}

export const DonationHistory = () => {
  const { toast } = useToast();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch donations for this donor user
      const { data, error } = await (supabase.from as any)("donations")
        .select("*, certificate_generated, certificate_url")
        .eq("donor_user_id", user.id)
        .order("donation_date", { ascending: false });

      if (error) throw error;

      // Fetch hospital names for each donation
      const hospitalIds = [...new Set((data || []).map((d: any) => d.hospital_id))] as string[];
      
      console.log("🏥 Hospital IDs to fetch:", hospitalIds);
      
      if (hospitalIds.length > 0) {
        const { data: hospitalProfiles, error: hospitalError } = await supabase
          .from("profiles")
          .select("id, hospital_name, full_name")
          .in("id", hospitalIds);

        if (hospitalError) {
          console.error("Error fetching hospital profiles:", hospitalError);
        } else {
          console.log("🏥 Hospital profiles fetched:", hospitalProfiles);
        }

        // Create a map of hospital IDs to names
        // Use hospital_name if available, otherwise fall back to full_name
        const hospitalMap = new Map(
          (hospitalProfiles || []).map((h: any) => {
            const name = h.hospital_name || h.full_name || "Unknown Hospital";
            console.log(`🏥 Mapping hospital ${h.id}: ${name}`);
            return [h.id, name];
          })
        );

        // Transform data to include hospital name
        const donationsWithHospital = (data || []).map((donation: any) => {
          const hospitalName = hospitalMap.get(donation.hospital_id) || "Unknown Hospital";
          console.log(`📋 Donation ${donation.id}: hospital_id=${donation.hospital_id}, hospital_name=${hospitalName}`);
          return {
            ...donation,
            hospital_name: hospitalName,
          };
        });

        setDonations(donationsWithHospital);
      } else {
        console.warn("⚠️ No hospital IDs found in donations");
        // If no hospital IDs, set donations without hospital names
        const donationsWithoutHospital = (data || []).map((donation: any) => ({
          ...donation,
          hospital_name: "Unknown Hospital",
        }));
        setDonations(donationsWithoutHospital);
      }
    } catch (error: any) {
      console.error("Error fetching donations:", error);
      toast({
        title: "Error",
        description: "Failed to load donation history.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return <div className="animate-pulse">Loading donation history...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Donation History</CardTitle>
        <p className="text-sm text-muted-foreground">
          View your complete blood donation history
        </p>
      </CardHeader>
      <CardContent>
        {donations.length === 0 ? (
          <div className="text-center py-12">
            <Droplet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No donations recorded yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Your donation history will appear here after you make a donation.
            </p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Hospital</TableHead>
                  <TableHead>Blood Group</TableHead>
                  <TableHead>Units</TableHead>
                  <TableHead className="text-right">Certificate</TableHead>
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
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{donation.hospital_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-semibold">
                        {donation.blood_group}
                      </Badge>
                    </TableCell>
                    <TableCell>{donation.units_donated}</TableCell>
                    <TableCell className="text-right">
                      {donation.certificate_generated && donation.certificate_url ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              // Fetch the certificate HTML content
                              const response = await fetch(donation.certificate_url!);
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
                              const donationDate = new Date(donation.donation_date).toLocaleDateString().replace(/\//g, '-');
                              link.download = `Blood_Donation_Certificate_${donationDate}.html`;
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
                          }}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">Pending</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

