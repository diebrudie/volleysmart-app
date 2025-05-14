
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
  
  // Player Onboarding
  {
    path: "/players/onboarding",
    element: (
      <ProtectedRoute>
        <PlayerOnboarding />
      </ProtectedRoute>
    ),
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
  
  // Protected Routes - need authentication and completed onboarding
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <AuthenticatedRoute>
          <Dashboard />
        </AuthenticatedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/matches",
    element: (
      <ProtectedRoute>
        <AuthenticatedRoute>
          <Matches />
        </AuthenticatedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/matches/:id",
    element: (
      <ProtectedRoute>
        <AuthenticatedRoute>
          <MatchDetail />
        </AuthenticatedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/players",
    element: (
      <ProtectedRoute>
        <AuthenticatedRoute>
          <Players />
        </AuthenticatedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/players/:id",
    element: (
      <ProtectedRoute>
        <AuthenticatedRoute>
          <PlayerDetail />
        </AuthenticatedRoute>
      </ProtectedRoute>
    ),
  },
  
  // Admin/Editor Only Routes
  {
    path: "/generate-teams",
    element: (
      <ProtectedRoute allowedRoles={['admin', 'editor']}>
        <AuthenticatedRoute>
          <TeamGenerator />
        </AuthenticatedRoute>
      </ProtectedRoute>
    ),
  },
  
  // Admin Only Routes
  {
    path: "/admin",
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AuthenticatedRoute>
          <Admin />
        </AuthenticatedRoute>
      </ProtectedRoute>
    ),
  },
  
  // Catch-all route
  {
    path: "*",
    element: <NotFound />,
  },
];
