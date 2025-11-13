import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  updateUserRole,
  getUserProfile,
} from "@/integrations/supabase/profiles";
import { supabase } from "@/integrations/supabase/client";

interface UserWithProfile {
  id: string;
  email: string;
  created_at: string;
}

const UserRoleManager = () => {
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Get all users - Note: this requires admin rights in Supabase
      const { data: authUsers, error: authError } =
        await supabase.auth.admin.listUsers();

      if (authError) throw authError;

      // For each user, get their profile to include their role
      const usersWithProfiles = await Promise.all(
        authUsers.users.map(async (user) => {
          try {
            const profile = await getUserProfile(user.id);
            return {
              id: user.id,
              email: user.email || "No email",
              created_at: user.created_at,
            };
          } catch (error) {
            return {
              id: user.id,
              email: user.email || "No email",

              created_at: user.created_at,
            };
          }
        })
      );

      setUsers(usersWithProfiles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description:
          "Failed to fetch users. You may not have admin privileges.",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading users...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>Manage user roles and permissions</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  No users found or global role management is disabled.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchUsers()}
                    >
                      Refresh
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default UserRoleManager;
