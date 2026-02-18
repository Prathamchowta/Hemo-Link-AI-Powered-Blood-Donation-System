import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { FileText, Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ActivityLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string;
  user_id: string;
  user_email?: string;
  changes?: any;
  timestamp: string;
}

export const AdminActivityLogs = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterTable, setFilterTable] = useState<string>("all");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      // Note: This requires an activity_logs table in the database
      // For now, we'll create a mock implementation that can be replaced with actual logs
      
      // Fetch recent changes from various tables to simulate activity logs
      const [donorsResult, requestsResult, inventoryResult, profilesResult] = await Promise.all([
        supabase.from("donors").select("id, created_at, updated_at").order("updated_at", { ascending: false }).limit(50),
        supabase.from("blood_requests").select("id, created_at, updated_at, status").order("updated_at", { ascending: false }).limit(50),
        supabase.from("blood_inventory").select("id, updated_at, units_available").order("updated_at", { ascending: false }).limit(50),
        supabase.from("profiles").select("id, created_at, updated_at").order("updated_at", { ascending: false }).limit(50),
      ]);

      const mockLogs: ActivityLog[] = [];

      // Process donors
      (donorsResult.data || []).forEach((donor: any) => {
        mockLogs.push({
          id: `donor-${donor.id}`,
          action: donor.created_at === donor.updated_at ? "INSERT" : "UPDATE",
          table_name: "donors",
          record_id: donor.id,
          user_id: "system",
          timestamp: donor.updated_at || donor.created_at,
        });
      });

      // Process requests
      (requestsResult.data || []).forEach((request: any) => {
        mockLogs.push({
          id: `request-${request.id}`,
          action: request.created_at === request.updated_at ? "INSERT" : "UPDATE",
          table_name: "blood_requests",
          record_id: request.id,
          user_id: "system",
          changes: { status: request.status },
          timestamp: request.updated_at || request.created_at,
        });
      });

      // Process inventory
      (inventoryResult.data || []).forEach((item: any) => {
        mockLogs.push({
          id: `inventory-${item.id}`,
          action: "UPDATE",
          table_name: "blood_inventory",
          record_id: item.id,
          user_id: "system",
          changes: { units_available: item.units_available },
          timestamp: item.updated_at,
        });
      });

      // Process profiles
      (profilesResult.data || []).forEach((profile: any) => {
        mockLogs.push({
          id: `profile-${profile.id}`,
          action: profile.created_at === profile.updated_at ? "INSERT" : "UPDATE",
          table_name: "profiles",
          record_id: profile.id,
          user_id: profile.id,
          timestamp: profile.updated_at || profile.created_at,
        });
      });

      // Sort by timestamp
      mockLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setLogs(mockLogs.slice(0, 100)); // Limit to 100 most recent
    } catch (error: any) {
      toast({
        title: "Error fetching activity logs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "INSERT": return "bg-green-500";
      case "UPDATE": return "bg-blue-500";
      case "DELETE": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.record_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = filterAction === "all" || log.action === filterAction;
    const matchesTable = filterTable === "all" || log.table_name === filterTable;

    return matchesSearch && matchesAction && matchesTable;
  });

  if (loading) {
    return <div className="animate-pulse">Loading activity logs...</div>;
  }

  return (
    <div className="space-y-4">
      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-6 w-6" />
            Activity Logs
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-6 flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-2"
              />
            </div>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[180px] border-2">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="INSERT">Created</SelectItem>
                <SelectItem value="UPDATE">Updated</SelectItem>
                <SelectItem value="DELETE">Deleted</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterTable} onValueChange={setFilterTable}>
              <SelectTrigger className="w-[180px] border-2">
                <SelectValue placeholder="Filter by table" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tables</SelectItem>
                <SelectItem value="donors">Donors</SelectItem>
                <SelectItem value="blood_requests">Requests</SelectItem>
                <SelectItem value="blood_inventory">Inventory</SelectItem>
                <SelectItem value="profiles">Profiles</SelectItem>
                <SelectItem value="user_roles">User Roles</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-2 rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold">Timestamp</TableHead>
                  <TableHead className="font-semibold">Action</TableHead>
                  <TableHead className="font-semibold">Table</TableHead>
                  <TableHead className="font-semibold">Record ID</TableHead>
                  <TableHead className="font-semibold">User</TableHead>
                  <TableHead className="font-semibold">Changes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {searchTerm ? "No logs match your search." : "No activity logs found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionColor(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{log.table_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {log.record_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{log.user_email || log.user_id}</TableCell>
                      <TableCell>
                        {log.changes ? (
                          <span className="text-xs text-muted-foreground">
                            {JSON.stringify(log.changes)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
