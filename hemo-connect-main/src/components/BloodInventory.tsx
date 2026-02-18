import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Droplet, Plus, Minus } from "lucide-react";

interface BloodInventoryItem {
  id: string;
  blood_group: string;
  units_available: number;
  last_updated: string;
}

export const BloodInventory = () => {
  const { toast } = useToast();
  const [inventory, setInventory] = useState<BloodInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<BloodInventoryItem | null>(null);
  const [unitsToAdd, setUnitsToAdd] = useState(0);

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Initialize inventory if it doesn't exist
      const { error: initError } = await supabase.rpc("initialize_blood_inventory", {
        hospital_user_id: user.id,
      });

      if (initError) console.error("Init error:", initError);

      const { data, error } = await supabase
        .from("blood_inventory")
        .select("*")
        .eq("hospital_id", user.id)
        .order("blood_group");

      if (error) throw error;
      setInventory(data || []);
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

  const handleUpdateUnits = async () => {
    if (!selectedGroup || unitsToAdd === 0) return;

    try {
      const newUnits = Math.max(0, selectedGroup.units_available + unitsToAdd);

      const { error } = await supabase
        .from("blood_inventory")
        .update({ units_available: newUnits, last_updated: new Date().toISOString() })
        .eq("id", selectedGroup.id);

      if (error) throw error;

      toast({
        title: "Inventory updated",
        description: `${selectedGroup.blood_group} inventory updated successfully`,
      });

      setIsDialogOpen(false);
      setUnitsToAdd(0);
      setSelectedGroup(null);
      fetchInventory();
    } catch (error: any) {
      toast({
        title: "Error updating inventory",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openDialog = (item: BloodInventoryItem) => {
    setSelectedGroup(item);
    setUnitsToAdd(0);
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div className="animate-pulse">Loading inventory...</div>;
  }

  const getStatusColor = (units: number) => {
    if (units === 0) return "bg-destructive/10 text-destructive";
    if (units < 10) return "bg-warning/10 text-warning";
    return "bg-success/10 text-success";
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {inventory.map((item) => (
          <div
            key={item.id}
            className="border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => openDialog(item)}
          >
            <div className="flex items-center justify-between mb-2">
              <Droplet className="h-6 w-6 text-primary" />
              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(item.units_available)}`}>
                {item.units_available === 0 ? "Empty" : item.units_available < 10 ? "Low" : "Available"}
              </span>
            </div>
            <div className="text-2xl font-bold text-primary mb-1">{item.blood_group}</div>
            <div className="text-sm text-muted-foreground">
              {item.units_available} units
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update {selectedGroup?.blood_group} Inventory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-2">Current Units</div>
              <div className="text-4xl font-bold text-primary">
                {selectedGroup?.units_available || 0}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Add/Remove Units</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUnitsToAdd(Math.max(-selectedGroup!.units_available, unitsToAdd - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={unitsToAdd}
                  onChange={(e) => setUnitsToAdd(parseInt(e.target.value) || 0)}
                  className="text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUnitsToAdd(unitsToAdd + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">New Total</div>
              <div className="text-2xl font-bold">
                {Math.max(0, (selectedGroup?.units_available || 0) + unitsToAdd)} units
              </div>
            </div>
            <Button onClick={handleUpdateUnits} className="w-full" disabled={unitsToAdd === 0}>
              Update Inventory
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
