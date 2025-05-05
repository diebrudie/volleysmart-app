
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
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
  signup: (email: string, password: string, name?: string) => Promise<void>;
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

  // Initialize auth state
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session);
        setSession(session);
        if (session?.user) {
          // Get user profile on auth change
          setTimeout(() => {
            getUserProfile(session.user);
          }, 0);
        } else {
          setUser(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session);
      setSession(session);
      if (session?.user) {
        getUserProfile(session.user);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Function to get user profile data
  const getUserProfile = async (authUser: User) => {
    try {
      setIsLoading(true);
      
      // Fetch user profile from the user_profiles table
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        throw error;
      }

      const userWithProfile: AuthUser = {
        id: authUser.id,
        email: authUser.email,
        name: profile?.email?.split('@')[0] || authUser.email?.split('@')[0] || 'User',
        role: profile?.role as UserRole || 'user',
      };

      setUser(userWithProfile);
    } catch (error) {
      console.error('Error getting user profile:', error);
      // Even if we can't get the profile, we still have a user
      setUser({
        id: authUser.id,
        email: authUser.email,
        name: authUser.email?.split('@')[0] || 'User',
        role: 'user'
      });
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

  const signup = async (email: string, password: string, name?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0], // Use email username if no name provided
          }
        }
      });

      if (error) throw error;

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
      await supabase.auth.signOut();
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
