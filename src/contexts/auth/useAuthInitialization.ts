
import { useEffect, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import { AuthUser } from '@/types/auth';

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
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event, currentSession?.user?.id);
        
        if (!mounted) return;
        
        if (currentSession?.user) {
          // Successfully authenticated
          const userData: AuthUser = {
            id: currentSession.user.id,
            email: currentSession.user.email || '',
            name: currentSession.user.email?.split('@')[0] || 'User',
            role: 'user'
          };
          
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

    const initializeAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (data.session?.user) {
          console.log('Found existing session for user:', data.session.user.id);
          
          const userData: AuthUser = {
            id: data.session.user.id,
            email: data.session.user.email || '',
            name: data.session.user.email?.split('@')[0] || 'User',
            role: 'user'
          };
          
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
