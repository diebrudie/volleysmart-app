import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { getPlayerByUserId } from '@/integrations/supabase/players';
import { Spinner } from '@/components/ui/spinner';

interface AuthenticatedRouteProps {
  children: React.ReactNode;
}

const AuthenticatedRoute = ({ children }: AuthenticatedRouteProps) => {
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

export default AuthenticatedRoute;
