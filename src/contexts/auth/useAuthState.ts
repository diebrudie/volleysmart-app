
import { useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { AuthUser } from '@/types/auth';
import { createMinimalUser } from './authUtils';

export function useAuthState() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const setUserFromSession = (currentSession: Session | null) => {
    if (currentSession?.user) {
      setUser(prevUser => {
        if (!prevUser) {
          return createMinimalUser(currentSession.user);
        }
        return prevUser;
      });
    } else {
      setUser(null);
    }
  };

  return {
    user,
    setUser,
    session,
    setSession,
    isLoading,
    setIsLoading,
    setUserFromSession
  };
}
