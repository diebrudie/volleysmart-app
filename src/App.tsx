
import { ToastProvider } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

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
import NewClub from "./pages/NewClub";
import InviteMembers from "./pages/InviteMembers";
import NewGame from "./pages/NewGame";

const queryClient = new QueryClient();

// Home route with authentication check
const HomeRoute = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/start" replace /> : <Home />;
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
              
              {/* Start Page after onboarding */}
              <Route 
                path="/start" 
                element={
                  <ProtectedRoute>
                    <Start />
                  </ProtectedRoute>
                } 
              />
              
              {/* Club Creation Flow */}
              <Route 
                path="/new-club" 
                element={
                  <ProtectedRoute>
                    <NewClub />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/invite-members/:clubId" 
                element={
                  <ProtectedRoute>
                    <InviteMembers />
                  </ProtectedRoute>
                } 
              />
              
              {/* Game Creation */}
              <Route 
                path="/new-game" 
                element={
                  <ProtectedRoute>
                    <NewGame />
                  </ProtectedRoute>
                } 
              />
              
              {/* Protected Routes - need authentication */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/matches" 
                element={
                  <ProtectedRoute>
                    <Matches />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/matches/:id" 
                element={
                  <ProtectedRoute>
                    <MatchDetail />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/players" 
                element={
                  <ProtectedRoute>
                    <Players />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/players/:id" 
                element={
                  <ProtectedRoute>
                    <PlayerDetail />
                  </ProtectedRoute>
                } 
              />
              
              {/* Admin/Editor Only Routes */}
              <Route 
                path="/generate-teams" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'editor']}>
                    <TeamGenerator />
                  </ProtectedRoute>
                } 
              />
              
              {/* Admin Only Routes */}
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Admin />
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
