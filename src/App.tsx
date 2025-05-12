
import { ToastProvider } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { getPlayerByUserId } from "@/integrations/supabase/players";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PlayerOnboarding from "./pages/PlayerOnboarding";
import Dashboard from "./pages/Dashboard";
import Matches from "./pages/Matches";
import MatchDetail from "./pages/MatchDetail";
import Players from "./pages/Players";
import PlayerDetail from "./pages/PlayerDetail";
import TeamGenerator from "./pages/TeamGenerator";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Start from "./pages/Start";

const queryClient = new QueryClient();

// Home route with authentication check
const HomeRoute = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Home />;
};

// Check for new users needing onboarding
const AuthenticatedRoute = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [hasPlayerProfile, setHasPlayerProfile] = useState(null);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);

  // Always use useEffect regardless of authentication state
  useEffect(() => {
    const checkPlayerProfile = async () => {
      if (!isLoading && isAuthenticated && user?.id) {
        try {
          setIsCheckingProfile(true);
          const playerProfile = await getPlayerByUserId(user.id);
          setHasPlayerProfile(!!playerProfile);
        } catch (error) {
          // If error is because profile doesn't exist
          setHasPlayerProfile(false);
        } finally {
          setIsCheckingProfile(false);
        }
      } else if (!isLoading) {
        // Make sure we exit loading state even if not authenticated
        setIsCheckingProfile(false);
      }
    };

    checkPlayerProfile();
  }, [isLoading, isAuthenticated, user?.id]);

  // Show loading while checking profile status
  if (isLoading || isCheckingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  // Redirect to onboarding if the user doesn't have a profile
  if (isAuthenticated && !hasPlayerProfile) {
    return <Navigate to="/players/onboarding" replace />;
  }

  // Otherwise, render the children (protected content)
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ToastProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomeRoute />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* Player Onboarding */}
              <Route 
                path="/players/onboarding" 
                element={
                  <ProtectedRoute>
                    <PlayerOnboarding />
                  </ProtectedRoute>
                } 
              />
              
              {/* Start Page after onboarding - This should not redirect once a user has visited it */}
              <Route 
                path="/start" 
                element={
                  <ProtectedRoute>
                    <Start />
                  </ProtectedRoute>
                } 
              />
              
              {/* Protected Routes - need authentication and completed onboarding */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <AuthenticatedRoute>
                      <Dashboard />
                    </AuthenticatedRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/matches" 
                element={
                  <ProtectedRoute>
                    <AuthenticatedRoute>
                      <Matches />
                    </AuthenticatedRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/matches/:id" 
                element={
                  <ProtectedRoute>
                    <AuthenticatedRoute>
                      <MatchDetail />
                    </AuthenticatedRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/players" 
                element={
                  <ProtectedRoute>
                    <AuthenticatedRoute>
                      <Players />
                    </AuthenticatedRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/players/:id" 
                element={
                  <ProtectedRoute>
                    <AuthenticatedRoute>
                      <PlayerDetail />
                    </AuthenticatedRoute>
                  </ProtectedRoute>
                } 
              />
              
              {/* Admin/Editor Only Routes */}
              <Route 
                path="/generate-teams" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'editor']}>
                    <AuthenticatedRoute>
                      <TeamGenerator />
                    </AuthenticatedRoute>
                  </ProtectedRoute>
                } 
              />
              
              {/* Admin Only Routes */}
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AuthenticatedRoute>
                      <Admin />
                    </AuthenticatedRoute>
                  </ProtectedRoute>
                } 
              />
              
              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ToastProvider>
  </QueryClientProvider>
);

export default App;
