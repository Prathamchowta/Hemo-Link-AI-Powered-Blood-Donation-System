import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Droplet, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface BloodInventoryItem {
  blood_group: string;
  total_units: number;
  hospitals: number;
  hospital_details: Array<{
    hospital_id: string;
    hospital_name: string;
    units_available: number;
  }>;
}

export const AdminBloodInventory = () => {
  const { toast } = useToast();
  const [inventory, setInventory] = useState<BloodInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      // Fetch all blood inventory across all hospitals
      const { data: allInventory, error } = await supabase
        .from("blood_inventory")
        .select("blood_group, units_available, hospital_id")
        .order("blood_group");

      if (error) throw error;

      // Fetch hospital profiles
      const hospitalIds = [...new Set((allInventory || []).map((item: any) => item.hospital_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, hospital_name, full_name")
        .in("id", hospitalIds);

      // Create hospital name map
      const hospitalMap = new Map(
        (profiles || []).map((p: any) => [p.id, p.hospital_name || p.full_name || "Unknown Hospital"])
      );

      // Aggregate by blood group
      const aggregated: Record<string, BloodInventoryItem> = {};

      bloodGroups.forEach(group => {
        aggregated[group] = {
          blood_group: group,
          total_units: 0,
          hospitals: 0,
          hospital_details: [],
        };
      });

      // Process inventory data
      (allInventory || []).forEach((item: any) => {
        const group = item.blood_group;
        if (aggregated[group]) {
          aggregated[group].total_units += item.units_available || 0;
          aggregated[group].hospitals += 1;
          aggregated[group].hospital_details.push({
            hospital_id: item.hospital_id,
            hospital_name: hospitalMap.get(item.hospital_id) || "Unknown Hospital",
            units_available: item.units_available || 0,
          });
        }
      });

      setInventory(Object.values(aggregated));
    } catch (error: any) {
      toast({
        title: "Error fetching inventory",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (units: number) => {
    if (units === 0) return "bg-destructive/10 text-destructive";
    if (units < 10) return "bg-warning/10 text-warning";
    return "bg-success/10 text-success";
  };

  if (loading) {
    return <div className="animate-pulse">Loading system-wide inventory...</div>;
  }

  return (
    <div className="space-y-4">
      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Droplet className="h-6 w-6" />
            System-Wide Blood Inventory
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            {inventory.map((item) => (
              <div
                key={item.blood_group}
                className="border-2 rounded-xl p-6 hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-white to-gray-50 hover:scale-105"
                onClick={() => setExpandedGroup(expandedGroup === item.blood_group ? null : item.blood_group)}
              >
                <div className="flex items-center justify-between mb-3">
                  <Droplet className="h-8 w-8 text-red-600" />
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusColor(item.total_units)}`}>
                    {item.total_units === 0 ? "Empty" : item.total_units < 10 ? "Low" : "Available"}
                  </span>
                </div>
                <div className="text-3xl font-bold text-red-700 mb-2">{item.blood_group}</div>
                <div className="text-lg font-semibold text-gray-700 mb-1">
                  {item.total_units} units
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  {item.hospitals} {item.hospitals === 1 ? "hospital" : "hospitals"}
                </div>
              </div>
            ))}
          </div>

          {expandedGroup && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">
                {expandedGroup} - Hospital Breakdown
              </h3>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hospital</TableHead>
                      <TableHead>Units Available</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.find(i => i.blood_group === expandedGroup)?.hospital_details.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No inventory data available for this blood group
                        </TableCell>
                      </TableRow>
                    ) : (
                      inventory
                        .find(i => i.blood_group === expandedGroup)
                        ?.hospital_details.map((hospital, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {hospital.hospital_name}
                            </TableCell>
                            <TableCell>{hospital.units_available}</TableCell>
                            <TableCell>
                              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(hospital.units_available)}`}>
                                {hospital.units_available === 0 ? "Empty" : hospital.units_available < 10 ? "Low" : "Available"}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
