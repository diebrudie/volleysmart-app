
import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { getPlayerByUserId } from '@/integrations/supabase/players';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';

interface AuthenticatedRouteProps {
  children: React.ReactNode;
}

const AuthenticatedRoute = ({ children }: AuthenticatedRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const { toast } = useToast();
  const [hasPlayerProfile, setHasPlayerProfile] = useState<boolean | null>(null);
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);

  useEffect(() => {
    let isMounted = true;
    let checkTimeout: NodeJS.Timeout | null = null;

    // Only check player profile if we're authenticated and not already checking
    const checkPlayerProfile = async () => {
      if (!isLoading && isAuthenticated && user?.id && !isCheckingProfile) {
        try {
          console.log('Checking if user has a player profile:', user.id);
          setIsCheckingProfile(true);
          const playerProfile = await getPlayerByUserId(user.id);
          
          if (isMounted) {
            const profileExists = !!playerProfile;
            console.log('Player profile exists:', profileExists);
            setHasPlayerProfile(profileExists);
            setIsCheckingProfile(false);
          }
        } catch (error) {
          console.error("Error checking player profile:", error);
          if (isMounted) {
            setIsCheckingProfile(false);
            
            if (retryAttempts < 2) {
              setRetryAttempts(prev => prev + 1);
              checkTimeout = setTimeout(() => {
                console.log('Retrying player profile check, attempt:', retryAttempts + 1);
                checkPlayerProfile();
              }, 1000);
            } else {
              // After retries, assume profile exists to avoid blocking the user
              console.log('Max retry attempts reached, allowing user to proceed');
              setHasPlayerProfile(true);
              
              toast({
                title: "Notice",
                description: "Unable to verify your profile, but you can continue using the app",
                variant: "default"
              });
            }
          }
        }
      } else if (!isLoading) {
        // Exit loading state even if not authenticated
        setIsCheckingProfile(false);
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
  }, [isLoading, isAuthenticated, user?.id, retryAttempts, toast, isCheckingProfile]);

  // Show loading while checking auth status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <Spinner className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          <span className="ml-2 mt-2">Checking authentication...</span>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    console.log('User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  // Checking profile - show loading
  if (isCheckingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <Spinner className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          <span className="ml-2 mt-2">Loading your profile...</span>
        </div>
      </div>
    );
  }

  // If we've tried checking the profile but got errors, just show the content
  if (retryAttempts >= 2 && hasPlayerProfile === null) {
    return <>{children}</>;
  }

  // If authenticated but no player profile, redirect to onboarding
  if (hasPlayerProfile === false) {
    console.log('User authenticated but no profile, redirecting to onboarding');
    return <Navigate to="/players/onboarding" replace />;
  }

  // Show protected content
  return <>{children}</>;
};

export default AuthenticatedRoute;
