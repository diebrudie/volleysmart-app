
import { useState, ReactNode, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AuthContext from './AuthContext';
import { AuthUser } from '@/types/auth';
import { fetchUserProfile, createMinimalUser, enrichUserWithProfile } from './authUtils';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    console.log('AuthProvider initialized');
    
    // Set up auth state listener FIRST
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!mounted) return;
        
        console.log('Auth state changed:', event);
        setSession(currentSession);
        
        if (currentSession?.user) {
          // We'll fetch profile in a separate effect to avoid infinite loops
          setUser(prevUser => {
            if (!prevUser) {
              // Just set minimal user info until profile is fetched
              return createMinimalUser(currentSession.user);
            }
            return prevUser;
          });
        } else {
          setUser(null);
          console.log('User logged out or no session');
        }
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      try {
        console.log('Checking for existing session');
        const { data } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        setSession(data.session);
        
        if (data.session?.user) {
          console.log('Found existing session for user:', data.session.user.id);
          // Just set basic user info initially
          setUser(createMinimalUser(data.session.user));
        } else {
          console.log('No existing session found');
          setUser(null);
        }
      } catch (error) {
        console.error("Error getting session:", error);
      } finally {
        if (mounted) {
          console.log('Setting isLoading to false');
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Separate effect for fetching user profile to avoid loops
  useEffect(() => {
    let mounted = true;
    
    const loadUserProfile = async () => {
      if (!user?.id || !session) return;
      
      try {
        const profile = await fetchUserProfile(user.id);
        
        if (!mounted) return;
        
        if (profile) {
          console.log('Profile found:', profile);
          setUser(prevUser => enrichUserWithProfile(prevUser, profile));
        }
      } catch (error) {
        console.error('Error getting user profile:', error);
      }
    };

    if (user?.id && session) {
      // Use setTimeout to avoid recursive RLS issues
      setTimeout(() => {
        if (mounted) loadUserProfile();
      }, 0);
    }

    return () => {
      mounted = false;
    };
  }, [user?.id, session]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('Attempting login for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      console.log('Login successful');
      toast({
        title: "Success",
        description: "You have successfully logged in",
      });
      
      return Promise.resolve();
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to log in. Please check your credentials.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, firstName?: string, lastName?: string) => {
    setIsLoading(true);
    try {
      console.log('Attempting signup for:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName || '',
            last_name: lastName || '',
          }
        }
      });

      if (error) throw error;

      console.log('Signup successful');
      toast({
        title: "Success",
        description: "Account created successfully. Please check your email for confirmation.",
      });
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      console.log('Requesting password reset for:', email);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });

      if (error) throw error;

      console.log('Password reset email sent');
      toast({
        title: "Success",
        description: "Password reset email sent. Please check your inbox.",
      });
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updatePassword = async (password: string) => {
    try {
      console.log('Updating password');
      const { error } = await supabase.auth.updateUser({
        password
      });

      if (error) throw error;

      console.log('Password updated successfully');
      toast({
        title: "Success",
        description: "Your password has been updated successfully.",
      });
    } catch (error: any) {
      console.error('Update password error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update password.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('Attempting logout');
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      console.log('Logout successful');
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive"
      });
    }
  };

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
