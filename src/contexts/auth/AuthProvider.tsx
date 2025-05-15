
import { ReactNode, useEffect } from 'react';
import AuthContext from './AuthContext';
import { useAuthState } from './useAuthState';
import { useAuthMethods } from './useAuthMethods';
import { useAuthInitialization } from './useAuthInitialization';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Handle auth state
  const {
    user,
    setUser,
    session,
    setSession,
    isLoading,
    setIsLoading
  } = useAuthState();

  // Initialize auth and handle profile loading
  useAuthInitialization({
    setUser,
    setSession,
    setIsLoading,
    user,
    session
  });

  // Auth methods (login, signup, etc.)
  const {
    login,
    signup,
    logout,
    resetPassword,
    updatePassword
  } = useAuthMethods(setUser, setSession, setIsLoading);

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile: user, 
      isAuthenticated: !!user, 
      isLoading, 
      login, 
      signup, 
      logout,
      resetPassword,
      updatePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};
