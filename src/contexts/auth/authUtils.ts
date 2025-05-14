
import { Session, User } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import { AuthUser } from '@/types/auth';
import { UserRole } from "@/types/supabase";

export const fetchUserProfile = async (userId: string): Promise<any> => {
  console.log('Fetching user profile for ID:', userId);
  
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
  
  return profile;
};

export const createMinimalUser = (user: User | null): AuthUser | null => {
  if (!user) return null;
  
  return {
    id: user.id,
    email: user.email,
    name: user.email?.split('@')[0] || 'User',
    role: 'user'
  };
};

export const enrichUserWithProfile = (baseUser: AuthUser | null, profile: any): AuthUser | null => {
  if (!baseUser) return null;
  
  return {
    ...baseUser,
    name: profile?.email?.split('@')[0] || baseUser.email?.split('@')[0] || 'User',
    role: profile?.role as UserRole || 'user',
  };
};
