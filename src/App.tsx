import { ToastProvider } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/auth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/auth";
import { useEffect, useState } from "react";
import { getPlayerByUserId } from "@/integrations/supabase/players";
import { Spinner } from "@/components/ui/spinner";

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Check for new users needing onboarding
const AuthenticatedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [hasPlayerProfile, setHasPlayerProfile] = useState<boolean | null>(null);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [profileCheckError, setProfileCheckError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkPlayerProfile = async () => {
      if (!isLoading && isAuthenticated && user?.id) {
        try {
          console.log('Checking if user has a player profile:', user.id);
          setIsCheckingProfile(true);
          const playerProfile = await getPlayerByUserId(user.id);
          
          if (isMounted) {
            const profileExists = !!playerProfile;
            console.log('Player profile exists:', profileExists);
            setHasPlayerProfile(profileExists);
            setProfileCheckError(false);
            setIsCheckingProfile(false);
          }
        } catch (error) {
          console.error("Error checking player profile:", error);
          // Only update state if component is still mounted
          if (isMounted) {
            setHasPlayerProfile(false);
            setProfileCheckError(true);
            setIsCheckingProfile(false);
          }
        }
      } else if (!isLoading) {
        // Make sure we exit loading state even if not authenticated
        if (isMounted) {
          console.log('Auth loaded, but user is not authenticated');
          setIsCheckingProfile(false);
        }
      }
    };

    if (isAuthenticated && user) {
      checkPlayerProfile();
    } else {
      setIsCheckingProfile(false);
    }

    return () => {
      isMounted = false;
    };
  }, [isLoading, isAuthenticated, user?.id]);

  // Show loading while checking profile status
  if (isLoading || isCheckingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <Spinner className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          <span className="ml-2 mt-2">Loading...</span>
        </div>
      </div>
    );
  }

  // Redirect to onboarding if the user doesn't have a profile
  if (isAuthenticated && hasPlayerProfile === false) {
    console.log('User authenticated but no profile, redirecting to onboarding');
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
              <Route path="/" element={<Home />} />
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
