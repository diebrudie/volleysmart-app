
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/spinner';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'editor' | 'user';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiresOnboarding?: boolean;
}

const ProtectedRoute = ({ children, allowedRoles, requiresOnboarding = true }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(false);

  // Check if user has completed onboarding (has a player profile)
  useEffect(() => {
    if (isAuthenticated && user && requiresOnboarding && location.pathname !== '/players/onboarding') {
      setIsCheckingOnboarding(true);
      
      const checkOnboarding = async () => {
        try {
          const { data: player, error } = await supabase
            .from('players')
            .select('id')
            .eq('user_id', user.id)
            .single();

          setHasCompletedOnboarding(!error && !!player);
        } catch (error) {
          console.error('Error checking onboarding status:', error);
          setHasCompletedOnboarding(false);
        } finally {
          setIsCheckingOnboarding(false);
        }
      };

      checkOnboarding();
    } else if (!requiresOnboarding || location.pathname === '/players/onboarding') {
      setHasCompletedOnboarding(true);
    }
  }, [isAuthenticated, user, requiresOnboarding, location.pathname]);

  if (isLoading || isCheckingOnboarding) {
    // Show a spinner while checking authentication status or onboarding
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-8 w-8 text-volleyball-primary" />
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect them to the login page, but save the current location they were
    // trying to go to so you can send them back there after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If onboarding is required and user hasn't completed it, redirect to onboarding
  if (requiresOnboarding && hasCompletedOnboarding === false && location.pathname !== '/players/onboarding') {
    return <Navigate to="/players/onboarding" replace />;
  }

  // If roles are specified, check if the user has one of the allowed roles
  if (allowedRoles && user) {
    const hasRequiredRole = allowedRoles.includes(user.role as UserRole);
    
    if (!hasRequiredRole) {
      // Redirect to dashboard if user doesn't have required role
      return <Navigate to="/dashboard" replace />;
    }
  }

  // If they're authenticated and have the required role (if specified), render the children
  return <>{children}</>;
};

export default ProtectedRoute;
