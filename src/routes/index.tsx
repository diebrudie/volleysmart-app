
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
import Dashboard from "@/pages/Dashboard";
import Matches from "@/pages/Matches";
import MatchDetail from "@/pages/MatchDetail";
import Players from "@/pages/Players";
import PlayerDetail from "@/pages/PlayerDetail";
import TeamGenerator from "@/pages/TeamGenerator";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/NotFound";
import Start from "@/pages/Start";
import PlayerOnboarding from "@/pages/PlayerOnboarding";

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
  
  // Onboarding is now completely optional
  {
    path: "/players/onboarding",
    element: <PlayerOnboarding />,
  },
  
  // Protected Routes - need authentication
  {
    path: "/dashboard",
    element: (
      <AuthenticatedRoute>
        <Dashboard />
      </AuthenticatedRoute>
    ),
  },
  {
    path: "/start",
    element: (
      <AuthenticatedRoute>
        <Start />
      </AuthenticatedRoute>
    ),
  },
  {
    path: "/matches",
    element: (
      <AuthenticatedRoute>
        <Matches />
      </AuthenticatedRoute>
    ),
  },
  {
    path: "/matches/:id",
    element: (
      <AuthenticatedRoute>
        <MatchDetail />
      </AuthenticatedRoute>
    ),
  },
  {
    path: "/players",
    element: (
      <AuthenticatedRoute>
        <Players />
      </AuthenticatedRoute>
    ),
  },
  {
    path: "/players/:id",
    element: (
      <AuthenticatedRoute>
        <PlayerDetail />
      </AuthenticatedRoute>
    ),
  },
  
  // Admin/Editor Only Routes
  {
    path: "/generate-teams",
    element: (
      <AuthenticatedRoute allowedRoles={['admin', 'editor']}>
        <TeamGenerator />
      </AuthenticatedRoute>
    ),
  },
  
  // Admin Only Routes
  {
    path: "/admin",
    element: (
      <AuthenticatedRoute allowedRoles={['admin']}>
        <Admin />
      </AuthenticatedRoute>
    ),
  },
  
  // Catch-all route
  {
    path: "*",
    element: <NotFound />,
  },
];
