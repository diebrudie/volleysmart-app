
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Matches from "./pages/Matches";
import MatchDetail from "./pages/MatchDetail";
import Players from "./pages/Players";
import PlayerDetail from "./pages/PlayerDetail";
import TeamGenerator from "./pages/TeamGenerator";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
