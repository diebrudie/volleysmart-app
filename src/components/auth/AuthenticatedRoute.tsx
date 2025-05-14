
import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { getPlayerByUserId } from '@/integrations/supabase/players';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';

interface AuthenticatedRouteProps {
  children: React.ReactNode;
}

const AuthenticatedRoute = ({ children }: AuthenticatedRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hasPlayerProfile, setHasPlayerProfile] = useState<boolean | null>(null);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [profileCheckError, setProfileCheckError] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);

  useEffect(() => {
    let isMounted = true;
    let checkTimeout: NodeJS.Timeout | null = null;

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
            setProfileCheckError(true);
            setIsCheckingProfile(false);
            
            // If we've tried less than 3 times, retry after a delay
            if (retryAttempts < 3) {
              setRetryAttempts(prev => prev + 1);
              checkTimeout = setTimeout(() => {
                console.log('Retrying player profile check, attempt:', retryAttempts + 1);
                checkPlayerProfile();
              }, 1000);
            } else {
              // After 3 attempts, just assume profile exists to avoid blocking the user
              console.log('Max retry attempts reached, allowing user to proceed');
              setHasPlayerProfile(true);
              
              toast({
                title: "Warning",
                description: "Profile check failed, but you can continue using the app",
                variant: "destructive"
              });
            }
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
      if (checkTimeout) clearTimeout(checkTimeout);
    };
  }, [isLoading, isAuthenticated, user?.id, retryAttempts, toast]);

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

  // If max retry attempts reached, just show the children
  if (retryAttempts >= 3 && profileCheckError) {
    return <>{children}</>;
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
