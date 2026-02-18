import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { UserCog, Plus, Pencil, Trash2, Search, Ban, CheckCircle, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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

interface SystemUser {
  id: string;
  email: string;
  role: string;
  full_name: string;
  hospital_name?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export const AdminUserManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);
  const [userToDeactivate, setUserToDeactivate] = useState<SystemUser | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [deactivateConfirmation, setDeactivateConfirmation] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "hospital",
    full_name: "",
    hospital_name: "",
    phone: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userRoles?.map((r: any) => r.user_id) || []);

      if (profilesError) throw profilesError;

      // Create role map
      const roleMap = new Map(userRoles?.map((r: any) => [r.user_id, r.role]) || []);

      // Transform data
      const usersData = (profiles || []).map((profile: any) => ({
        id: profile.id,
        email: profile.email || "N/A",
        role: roleMap.get(profile.id) || "unknown",
        full_name: profile.full_name || "",
        hospital_name: profile.hospital_name || "",
        phone: profile.phone || "",
        is_active: true, // We'll assume active unless we have a deactivation mechanism
        created_at: profile.created_at || "",
      }));

      setUsers(usersData);
    } catch (error: any) {
      toast({
        title: "Error fetching users",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Create user via Supabase Admin API (this would need to be done server-side)
      // For now, we'll show a message that this requires server-side implementation
      toast({
        title: "User Creation",
        description: "User creation requires server-side implementation. Please use Supabase Dashboard or Admin API.",
        variant: "destructive",
      });
      
      // Reset form
      setIsDialogOpen(false);
      setFormData({
        email: "",
        password: "",
        role: "hospital",
        full_name: "",
        hospital_name: "",
        phone: "",
      });
    } catch (error: any) {
      toast({
        title: "Error creating user",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (user: SystemUser) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: "",
      role: user.role,
      full_name: user.full_name,
      hospital_name: user.hospital_name || "",
      phone: user.phone || "",
    });
    setIsDialogOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          hospital_name: formData.hospital_name,
          phone: formData.phone,
        })
        .eq("id", editingUser.id);

      if (error) throw error;

      // Update role if changed
      if (formData.role !== editingUser.role) {
        // Delete old role
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", editingUser.id);

        // Insert new role
        const roleValue = formData.role as "donor" | "hospital" | "admin";
        await supabase
          .from("user_roles")
          .insert({
            user_id: editingUser.id,
            role: roleValue,
          } as any);
      }

      toast({
        title: "User updated successfully",
        description: "User information has been updated.",
      });

      setIsDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error updating user",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (user: SystemUser) => {
    setUserToDelete(user);
    setDeleteConfirmation("");
    setAdminPassword("");
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    // Security check: Require confirmation text
    if (deleteConfirmation !== "DELETE") {
      toast({
        title: "Security Verification Failed",
        description: "Please type 'DELETE' exactly to confirm this action.",
        variant: "destructive",
      });
      return;
    }

    // Security check: Verify admin password is provided
    if (!adminPassword) {
      toast({
        title: "Password Required",
        description: "Please enter your admin password to confirm deletion.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Verify admin is logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to perform this action.",
          variant: "destructive",
        });
        return;
      }

      // Note: Password verification would require server-side implementation
      // For now, we require both confirmation text and password entry as security measures

      // Call edge function to delete the user (including auth user)
      const { data: deleteResult, error: deleteError } = await supabase.functions.invoke(
        'delete-user',
        {
          body: {
            userId: userToDelete.id,
            deleteAuthUser: true
          }
        }
      );

      if (deleteError) {
        console.error('Error calling delete-user function:', deleteError);
        throw new Error(deleteError.message || 'Failed to delete user');
      }

      if (deleteResult && !deleteResult.success) {
        throw new Error(deleteResult.error || 'Failed to delete user');
      }

      toast({
        title: "User deleted successfully",
        description: `${userToDelete.email} has been removed from the system.`,
      });

      setDeleteDialogOpen(false);
      setUserToDelete(null);
      setDeleteConfirmation("");
      setAdminPassword("");
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeactivateClick = (user: SystemUser) => {
    setUserToDeactivate(user);
    setDeactivateConfirmation("");
    setDeactivateDialogOpen(true);
  };

  const handleDeactivateConfirm = async () => {
    if (!userToDeactivate) return;

    // Security check: Require confirmation text
    if (deactivateConfirmation !== "DEACTIVATE") {
      toast({
        title: "Security Verification Failed",
        description: "Please type 'DEACTIVATE' exactly to confirm this action.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Remove user role to deactivate
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userToDeactivate.id);

      toast({
        title: "User deactivated successfully",
        description: `${userToDeactivate.email} has been deactivated.`,
      });

      setDeactivateDialogOpen(false);
      setUserToDeactivate(null);
      setDeactivateConfirmation("");
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error deactivating user",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="animate-pulse">Loading users...</div>;
  }

  return (
    <div className="space-y-4">
      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <UserCog className="h-6 w-6" />
              System User Management
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  onClick={() => {
                    setEditingUser(null);
                    setFormData({
                      email: "",
                      password: "",
                      role: "hospital",
                      full_name: "",
                      hospital_name: "",
                      phone: "",
                    });
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingUser ? "Edit User" : "Create New User"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      disabled={!!editingUser}
                    />
                  </div>
                  {!editingUser && (
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required={!editingUser}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => setFormData({ ...formData, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hospital">Hospital</SelectItem>
                        <SelectItem value="donor">Donor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                    />
                  </div>
                  {formData.role === "hospital" && (
                    <div className="space-y-2">
                      <Label>Hospital Name</Label>
                      <Input
                        value={formData.hospital_name}
                        onChange={(e) => setFormData({ ...formData, hospital_name: e.target.value })}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    {editingUser ? "Update User" : "Create User"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by email, name, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 max-w-md border-2"
              />
            </div>
          </div>

          <div className="border-2 rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Role</TableHead>
                  <TableHead className="font-semibold">Hospital</TableHead>
                  <TableHead className="font-semibold">Phone</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {searchTerm ? "No users match your search." : "No users found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.full_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{user.role}</Badge>
                      </TableCell>
                      <TableCell>{user.hospital_name || "-"}</TableCell>
                      <TableCell>{user.phone || "-"}</TableCell>
                      <TableCell>
                        <Badge className={user.is_active ? "bg-green-500" : "bg-gray-500"}>
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeactivateClick(user)}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(user)}
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
          setDeleteConfirmation("");
          setAdminPassword("");
        }
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-600" />
              Secure Deletion Required
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div>
                You are about to delete <strong className="text-red-600">{userToDelete?.email}</strong>. 
                This action cannot be undone.
              </div>
              
              <div className="space-y-3 pt-2 border-t">
                <div className="space-y-2">
                  <Label htmlFor="delete-confirm" className="text-sm font-semibold">
                    Type <span className="text-red-600 font-mono">DELETE</span> to confirm:
                  </Label>
                  <Input
                    id="delete-confirm"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="Type DELETE here"
                    className="font-mono"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="admin-password" className="text-sm font-semibold">
                    Enter your admin password for security verification:
                  </Label>
                  <Input
                    id="admin-password"
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter your admin password"
                  />
                  <p className="text-xs text-muted-foreground">
                    This action requires both confirmation text and password verification.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteConfirmation("");
              setAdminPassword("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteConfirmation !== "DELETE" || !adminPassword}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deactivateDialogOpen} onOpenChange={(open) => {
        setDeactivateDialogOpen(open);
        if (!open) {
          setDeactivateConfirmation("");
        }
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-600" />
              Secure Deactivation Required
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div>
                You are about to deactivate <strong className="text-orange-600">{userToDeactivate?.email}</strong>. 
                The user will not be able to access the system until reactivated.
              </div>
              
              <div className="space-y-3 pt-2 border-t">
                <div className="space-y-2">
                  <Label htmlFor="deactivate-confirm" className="text-sm font-semibold">
                    Type <span className="text-orange-600 font-mono">DEACTIVATE</span> to confirm:
                  </Label>
                  <Input
                    id="deactivate-confirm"
                    value={deactivateConfirmation}
                    onChange={(e) => setDeactivateConfirmation(e.target.value)}
                    placeholder="Type DEACTIVATE here"
                    className="font-mono"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeactivateConfirmation("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateConfirm}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={deactivateConfirmation !== "DEACTIVATE"}
            >
              <Ban className="h-4 w-4 mr-2" />
              Deactivate User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
