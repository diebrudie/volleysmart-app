
import { useEffect, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import { AuthUser } from '@/types/auth';
import { createMinimalUser } from './authUtils';

type AuthStateProps = {
  setUser: (user: AuthUser | null) => void;
  setSession: (session: Session | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  user: AuthUser | null;
  session: Session | null;
}

export function useAuthInitialization({
  setUser,
  setSession,
  setIsLoading,
  user,
  session
}: AuthStateProps) {
  const initializedRef = useRef(false);
  
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    let mounted = true;
    console.log('AuthProvider initialized');
    
    // Set up the auth listener first
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('Auth state changed:', event, currentSession?.user?.id);
        
        if (!mounted) return;
        
        if (currentSession?.user) {
          // Create a minimal user object to avoid circular references
          const userData = createMinimalUser(currentSession.user);
          
          setUser(userData);
          setSession(currentSession);
        } else if (event === 'SIGNED_OUT') {
          // User signed out
          setUser(null);
          setSession(null);
        }
        
        setIsLoading(false);
      }
    );

    // Then check for an existing session
    const initializeAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (data.session?.user) {
          console.log('Found existing session for user:', data.session.user.id);
          
          // Create a minimal user object to avoid circular references
          const userData = createMinimalUser(data.session.user);
          
          setUser(userData);
          setSession(data.session);
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
  }, [setUser, setSession, setIsLoading]);
}
