
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { Spinner } from '@/components/ui/spinner';

type UserRole = 'admin' | 'editor' | 'user';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute - Auth state:', { isAuthenticated, isLoading, userRole: user?.role });

  if (isLoading) {
    // Show a spinner while checking authentication status
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <Spinner className="h-8 w-8 text-volleyball-primary" />
          <span className="ml-2 text-gray-600">Checking authentication...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login');
    // Redirect them to the login page, but save the current location they were
    // trying to go to so you can send them back there after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If roles are specified, check if the user has one of the allowed roles
  if (allowedRoles && user) {
    const hasRequiredRole = allowedRoles.includes(user.role as UserRole);
    
    if (!hasRequiredRole) {
      console.log('User does not have required role, redirecting to dashboard');
      // Redirect to dashboard if user doesn't have required role
      return <Navigate to="/dashboard" replace />;
    }
  }

  // If they're authenticated and have the required role (if specified), render the children
  return <>{children}</>;
};

export default ProtectedRoute;
