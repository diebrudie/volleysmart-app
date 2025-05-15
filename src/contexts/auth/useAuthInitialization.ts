
import { useEffect, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import { AuthUser } from '@/types/auth';
import { fetchUserProfile, enrichUserWithProfile } from './authUtils';

type AuthStateProps = {
  setUser: (user: AuthUser | null | ((prev: AuthUser | null) => AuthUser | null)) => void;
  setSession: (session: Session | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setUserFromSession: (session: Session | null) => void;
  user: AuthUser | null;
  session: Session | null;
}

export function useAuthInitialization({
  setUser,
  setSession,
  setIsLoading,
  setUserFromSession,
  user,
  session
}: AuthStateProps) {
  // Use a ref to track initialization
  const initializedRef = useRef(false);
  
  // Set up auth state listener and check for existing session
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    let mounted = true;
    console.log('AuthProvider initialized');
    
    // Set up auth state listener FIRST
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!mounted) return;
        
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
        } else if (currentSession?.user) {
          setSession(currentSession);
          setUserFromSession(currentSession);
        }
        
        // Always end loading state after an auth event
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      try {
        console.log('Checking for existing session');
        const { data } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (data.session?.user) {
          console.log('Found existing session for user:', data.session.user.id);
          setSession(data.session);
          setUserFromSession(data.session);
        } else {
          console.log('No existing session found');
          setUser(null);
          setSession(null);
        }
      } catch (error) {
        console.error("Error getting session:", error);
        setUser(null);
        setSession(null);
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
  }, [setUser, setSession, setIsLoading, setUserFromSession]);
}
