import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

// Pages
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import VerifyEmail from "@/pages/VerifyEmail";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import PlayerOnboarding from "@/pages/PlayerOnboarding";
import Dashboard from "@/pages/Dashboard";
import Games from "@/pages/Games";
import GameDetail from "@/pages/GameDetail";
import Players from "@/pages/Players";
import Members from "@/pages/Members";
import ManageMembers from "@/pages/ManageMembers";
import PlayerDetail from "@/pages/PlayerDetail";
import TeamGenerator from "@/pages/TeamGenerator";
import EditGame from "@/pages/EditGame";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/NotFound";
import Start from "@/pages/Start";
import NewClub from "@/pages/NewClub";
import JoinClub from "@/pages/JoinClub";
import InviteMembers from "@/pages/InviteMembers";
import NewGame from "@/pages/NewGame";
import Profile from "@/pages/Profile";
import Clubs from "@/pages/Clubs";
import ClubGuard from "@/components/routing/ClubGuard";

const HomeRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  if (isAuthenticated) {
    return <Navigate to="/clubs" replace />;
  }

  return <Home />;
};

const AppRoutes = () => (
  <Routes>
    {/* Public Routes */}
    <Route path="/" element={<HomeRoute />} />
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />
    <Route path="/verify-email" element={<VerifyEmail />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />

    {/* All Protected Routes - require authentication */}
    <Route
      path="/players/onboarding"
      element={
        <ProtectedRoute requiresOnboarding={false}>
          <PlayerOnboarding />
        </ProtectedRoute>
      }
    />

    <Route
      path="/start"
      element={
        <ProtectedRoute requiresCompletedOnboarding={false}>
          <Start />
        </ProtectedRoute>
      }
    />

    <Route
      path="/new-club"
      element={
        <ProtectedRoute>
          <NewClub />
        </ProtectedRoute>
      }
    />
    <Route
      path="/join-club"
      element={
        <ProtectedRoute>
          <JoinClub />
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

    <Route
      path="/clubs"
      element={
        <ProtectedRoute>
          <Clubs />
        </ProtectedRoute>
      }
    />

    <Route
      path="/new-game/:clubId"
      element={
        <ProtectedRoute>
          <NewGame />
        </ProtectedRoute>
      }
    />

    <Route
      path="/user/:userId"
      element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      }
    />
    <Route
      path="/dashboard/:clubId"
      element={
        <ProtectedRoute>
          <ClubGuard>
            <Dashboard />
          </ClubGuard>
        </ProtectedRoute>
      }
    />

    {/* Safety redirect: bare /dashboard → /clubs */}
    <Route path="/dashboard" element={<Navigate to="/clubs" replace />} />
    <Route
      path="/games/:clubId"
      element={
        <ProtectedRoute>
          <ClubGuard>
            <Games />
          </ClubGuard>
        </ProtectedRoute>
      }
    />

    <Route
      path="/game-details/:matchDayId"
      element={
        <ProtectedRoute>
          <GameDetail />
        </ProtectedRoute>
      }
    />
    <Route
      path="/players/:clubId"
      element={
        <ProtectedRoute>
          <Players />
        </ProtectedRoute>
      }
    />
    <Route
      path="/members/:clubId"
      element={
        <ProtectedRoute>
          <ClubGuard>
            <Members />
          </ClubGuard>
        </ProtectedRoute>
      }
    />

    <Route
      path="/clubs/:clubId/manage"
      element={
        <ProtectedRoute>
          <ManageMembers />
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
        <ProtectedRoute allowedRoles={["admin", "editor"]}>
          <TeamGenerator />
        </ProtectedRoute>
      }
    />
    <Route
      path="/edit-game/:clubId/:gameId"
      element={
        <ProtectedRoute allowedRoles={["admin", "editor", "member", "user"]}>
          <EditGame />
        </ProtectedRoute>
      }
    />

    {/* Admin Only Routes */}
    <Route
      path="/admin"
      element={
        <ProtectedRoute allowedRoles={["admin"]}>
          <Admin />
        </ProtectedRoute>
      }
    />

    {/* Catch-all route */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
