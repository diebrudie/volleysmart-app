
import { useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { AuthUser } from '@/types/auth';

export function useAuthState() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  return {
    user,
    setUser,
    session,
    setSession,
    isLoading,
    setIsLoading
  };
}
