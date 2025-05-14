
import { RouteObject } from "react-router-dom";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AuthenticatedRoute from "@/components/auth/AuthenticatedRoute";

// Pages
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import VerifyEmail from "@/pages/VerifyEmail";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import PlayerOnboarding from "@/pages/PlayerOnboarding";
import Dashboard from "@/pages/Dashboard";
import Matches from "@/pages/Matches";
import MatchDetail from "@/pages/MatchDetail";
import Players from "@/pages/Players";
import PlayerDetail from "@/pages/PlayerDetail";
import TeamGenerator from "@/pages/TeamGenerator";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/NotFound";
import Start from "@/pages/Start";

export const routes: RouteObject[] = [
  // Public Routes
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/signup",
    element: <Signup />,
  },
  {
    path: "/verify-email",
    element: <VerifyEmail />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },
  {
    path: "/reset-password",
    element: <ResetPassword />,
  },
  
  // Player Onboarding - No longer requires auth to prevent blocking
  {
    path: "/players/onboarding",
    element: <PlayerOnboarding />,
  },
  
  // Start Page after onboarding
  {
    path: "/start",
    element: (
      <ProtectedRoute>
        <Start />
      </ProtectedRoute>
    ),
  },
  
  // Protected Routes - need authentication
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/matches",
    element: (
      <ProtectedRoute>
        <Matches />
      </ProtectedRoute>
    ),
  },
  {
    path: "/matches/:id",
    element: (
      <ProtectedRoute>
        <MatchDetail />
      </ProtectedRoute>
    ),
  },
  {
    path: "/players",
    element: (
      <ProtectedRoute>
        <Players />
      </ProtectedRoute>
    ),
  },
  {
    path: "/players/:id",
    element: (
      <ProtectedRoute>
        <PlayerDetail />
      </ProtectedRoute>
    ),
  },
  
  // Admin/Editor Only Routes
  {
    path: "/generate-teams",
    element: (
      <ProtectedRoute allowedRoles={['admin', 'editor']}>
        <TeamGenerator />
      </ProtectedRoute>
    ),
  },
  
  // Admin Only Routes
  {
    path: "/admin",
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <Admin />
      </ProtectedRoute>
    ),
  },
  
  // Catch-all route
  {
    path: "*",
    element: <NotFound />,
  },
];
