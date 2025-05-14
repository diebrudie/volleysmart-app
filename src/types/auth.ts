
import { UserRole } from "@/types/supabase";

export interface AuthUser {
  id: string;
  email: string | undefined;
  name: string;
  role: UserRole;
}

export interface AuthContextType {
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
