
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { Spinner } from '@/components/ui/spinner';

interface AuthenticatedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const AuthenticatedRoute = ({ children, allowedRoles }: AuthenticatedRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuth();

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
  
  // If roles are specified, check if user has required role
  if (allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
    console.log('User does not have required role, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // Show protected content
  return <>{children}</>;
};

export default AuthenticatedRoute;
