import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/spinner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "admin" | "editor" | "user";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiresOnboarding?: boolean;
  requiresCompletedOnboarding?: boolean;
}

const ProtectedRoute = ({
  children,
  allowedRoles,
  requiresOnboarding = true,
  requiresCompletedOnboarding = false,
}: ProtectedRouteProps) => {
  console.log("🔒 PROTECTED ROUTE RENDERING FOR MEMBERS");
  console.log("🔒 Location pathname:", useLocation().pathname);

  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  console.log("🔒 PROTECTED ROUTE RENDERING");
  console.log("🔒 Location pathname:", location.pathname);
  console.log("🔒 isAuthenticated:", isAuthenticated);
  console.log("🔒 isLoading:", isLoading);
  console.log("🔒 user:", user);

  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<
    boolean | null
  >(null);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(false);

  // Check if user has completed onboarding (has a player profile)
  useEffect(() => {
    console.log("🔍 ProtectedRoute - Starting onboarding check");
    console.log("🔍 ProtectedRoute - User:", user);
    console.log("🔍 ProtectedRoute - Location:", location.pathname);
    console.log("🔍 ProtectedRoute - requiresOnboarding:", requiresOnboarding);
    console.log(
      "🔍 ProtectedRoute - requiresCompletedOnboarding:",
      requiresCompletedOnboarding
    );

    if (
      isAuthenticated &&
      user &&
      (requiresOnboarding || requiresCompletedOnboarding) &&
      location.pathname !== "/players/onboarding"
    ) {
      setIsCheckingOnboarding(true);

      const checkOnboarding = async () => {
        try {
          const { data: player, error } = await supabase
            .from("players")
            .select("id")
            .eq("user_id", user.id)
            .single();

          setHasCompletedOnboarding(!error && !!player);
        } catch (error) {
          console.error("Error checking onboarding status:", error);
          setHasCompletedOnboarding(false);
        } finally {
          setIsCheckingOnboarding(false);
        }
      };

      checkOnboarding();
    } else if (!requiresOnboarding && !requiresCompletedOnboarding) {
      setHasCompletedOnboarding(true);
    } else if (location.pathname === "/players/onboarding") {
      setHasCompletedOnboarding(true);
    }
  }, [
    isAuthenticated,
    user,
    requiresOnboarding,
    requiresCompletedOnboarding,
    location.pathname,
  ]);

  // Show loading spinner while checking auth state
  if (isLoading || isCheckingOnboarding) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-8 w-8 text-volleyball-primary" />
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If onboarding is required and user hasn't completed it, redirect to onboarding
  if (
    requiresOnboarding &&
    hasCompletedOnboarding === false &&
    location.pathname !== "/players/onboarding"
  ) {
    return <Navigate to="/players/onboarding" replace />;
  }

  // If completed onboarding is required but user hasn't completed it, redirect to onboarding
  if (requiresCompletedOnboarding && hasCompletedOnboarding === false) {
    return <Navigate to="/players/onboarding" replace />;
  }

  // If roles are specified, check if the user has one of the allowed roles
  if (allowedRoles && user) {
    const hasRequiredRole = allowedRoles.includes(user.role as UserRole);

    if (!hasRequiredRole) {
      // Redirect to dashboard if user doesn't have required role
      return <Navigate to="/clubs" replace />;
    }
  }

  // If they're authenticated and have the required role (if specified), render the children
  return <>{children}</>;
};

export default ProtectedRoute;
