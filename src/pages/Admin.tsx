import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import UserRoleManager from "@/components/admin/UserRoleManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Admin = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading...
      </div>
    );
  }

  // Check if user is admin, if not redirect to dashboard
  if (!user || user.role !== "admin") {
    return <Navigate to="/clubs" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

          <Tabs defaultValue="users">
            <TabsList className="mb-6">
              <TabsTrigger value="users">User Management</TabsTrigger>
              <TabsTrigger value="settings">System Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <UserRoleManager />
            </TabsContent>

            <TabsContent value="settings">
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium mb-4">System Settings</h2>
                <p>Admin settings will be available here in future updates.</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Admin;
