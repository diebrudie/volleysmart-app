
import { User } from '@supabase/supabase-js';
import { AuthUser } from '@/types/auth';
import { UserRole } from "@/types/supabase";

export const createMinimalUser = (user: User | null): AuthUser | null => {
  if (!user) return null;
  
  return {
    id: user.id,
    email: user.email || '',
    name: user.email?.split('@')[0] || 'User',
    role: 'user'
  };
};

export const getUserDisplayName = (user: AuthUser | null): string => {
  if (!user) return 'Guest';
  
  return user.name || user.email?.split('@')[0] || 'User';
};
