
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";

type UserRole = 'admin' | 'editor' | 'user';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('volleyteam-user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user', error);
        localStorage.removeItem('volleyteam-user');
      }
    }
    setIsLoading(false);
  }, []);

  // This is a mock implementation - in real app, would use Supabase
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Mock login - in real app, this would call Supabase auth.signIn
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, assign roles based on email
      let role: UserRole = 'user';
      if (email.includes('admin')) {
        role = 'admin';
      } else if (email.includes('editor')) {
        role = 'editor';
      }
      
      const user = {
        id: 'user-' + Math.random().toString(36).substr(2, 9),
        email,
        name: email.split('@')[0],
        role
      };
      
      setUser(user);
      localStorage.setItem('volleyteam-user', JSON.stringify(user));
      toast({
        title: "Success",
        description: "You have successfully logged in",
      });
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Error",
        description: "Failed to log in. Please check your credentials.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      // Mock signup - in real app, this would call Supabase auth.signUp
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const user = {
        id: 'user-' + Math.random().toString(36).substr(2, 9),
        email,
        name,
        role: 'user' as UserRole
      };
      
      setUser(user);
      localStorage.setItem('volleyteam-user', JSON.stringify(user));
      toast({
        title: "Success",
        description: "Account created successfully",
      });
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: "Error",
        description: "Failed to create account. Please try again.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Mock logout - in real app, this would call Supabase auth.signOut
    setUser(null);
    localStorage.removeItem('volleyteam-user');
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
