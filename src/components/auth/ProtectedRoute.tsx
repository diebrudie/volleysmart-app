import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/spinner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: unknown;
  requiresOnboarding?: boolean;
  requiresCompletedOnboarding?: boolean;
}

const ProtectedRoute = ({
  children,
  allowedRoles,
  requiresOnboarding = true,
  requiresCompletedOnboarding = false,
}: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<
    boolean | null
  >(null);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(false);

  // Check if user has completed onboarding (has a player profile)
  useEffect(() => {
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

  // Show loading while checking auth state OR onboarding
  if (isLoading || isCheckingOnboarding) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-8 w-8 text-volleyball-primary" />
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  // Redirect to login ONLY if definitely not authenticated and not loading
  if (!isLoading && !isAuthenticated) {
    /*console.log("[Route] redirect → /login", {
      isLoading,
      isAuthenticated,
      path: location.pathname,
    });
    */

    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If onboarding is required and user hasn't completed it, redirect to onboarding
  if (
    requiresOnboarding &&
    hasCompletedOnboarding === false &&
    location.pathname !== "/players/onboarding"
  ) {
    /*console.log("[Route] redirect → /players/onboarding", {
      requiresOnboarding,
      path: location.pathname,
    });
    */

    return <Navigate to="/players/onboarding" replace />;
  }

  // If completed onboarding is required but user hasn't completed it, redirect to onboarding
  if (requiresCompletedOnboarding && hasCompletedOnboarding === false) {
    return <Navigate to="/players/onboarding" replace />;
  }

  // If they're authenticated and have the required role (if specified), render the children
  /*console.log("[Route] render children", { path: location.pathname });*/

  return <>{children}</>;
};

export default ProtectedRoute;
