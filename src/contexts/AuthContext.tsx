
import { createContext, useContext, useState, useRef, ReactNode, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from '@supabase/supabase-js';
import { UserRole } from "@/types/supabase";

interface AuthUser {
  id: string;
  email: string | undefined;
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  userProfile: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const hasFetchedProfile = useRef(false);
  const isInitialized = useRef(false);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Set up auth state listener FIRST
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.id);
            
            if (!mounted) return;
            
            setSession(session);
            
            if (session?.user) {
              // Only fetch profile if we haven't already or if this is a new session
              if (!hasFetchedProfile.current || event === 'SIGNED_IN') {
                hasFetchedProfile.current = true;
                await getUserProfile(session.user);
              }
            } else {
              // Only clear user state if we're explicitly signed out
              if (event === 'SIGNED_OUT') {
                console.log('User signed out, clearing state');
                setUser(null);
                hasFetchedProfile.current = false;
              }
              setIsLoading(false);
            }
          }
        );

        // THEN check for existing session
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        console.log('Initial session check:', existingSession?.user?.id);
        
        if (!mounted) return;
        
        setSession(existingSession);
        if (existingSession?.user) {
          hasFetchedProfile.current = true;
          await getUserProfile(existingSession.user);
        } else {
          setIsLoading(false);
        }

        isInitialized.current = true;

        return () => {
          mounted = false;
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // Function to get user profile data
  const getUserProfile = async (authUser: User) => {
    try {
      setIsLoading(true);
      
      console.log('Fetching user profile for:', authUser.id);
      
      // Try to fetch user profile from the user_profiles table
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.log('No profile found in user_profiles, using fallback data:', error.message);
      }

      const userWithProfile: AuthUser = {
        id: authUser.id,
        email: authUser.email,
        name: profile?.email?.split('@')[0] || authUser.email?.split('@')[0] || 'User',
        role: profile?.role as UserRole || 'user',
      };

      console.log('Setting user profile:', userWithProfile);
      setUser(userWithProfile);
    } catch (error) {
      console.error('Error getting user profile:', error);
      // Always set user even if profile fetch fails
      const fallbackUser: AuthUser = {
        id: authUser.id,
        email: authUser.email,
        name: authUser.email?.split('@')[0] || 'User',
        role: 'user'
      };
      console.log('Setting fallback user:', fallbackUser);
      setUser(fallbackUser);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

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

      toast({
        title: "Success",
        description: "Account created successfully. You'll be redirected to complete your profile.",
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });

      if (error) throw error;

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
      const { error } = await supabase.auth.updateUser({
        password
      });

      if (error) throw error;

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
      // Clear user state immediately to prevent confusion
      setUser(null);
      setSession(null);
      hasFetchedProfile.current = false;
      
      await supabase.auth.signOut();
      
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
      
      // Redirect to home page instead of /start
      window.location.href = '/';
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
