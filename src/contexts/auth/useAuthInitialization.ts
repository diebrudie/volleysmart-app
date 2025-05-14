
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
  // Use a ref to track component mount status
  const mountedRef = useRef(true);
  
  // Set up auth state listener and check for existing session
  useEffect(() => {
    let mounted = true;
    console.log('AuthProvider initialized');
    
    // Set up auth state listener FIRST
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!mounted) return;
        
        console.log('Auth state changed:', event);
        setSession(currentSession);
        
        if (currentSession?.user) {
          setUserFromSession(currentSession);
        } else {
          setUser(null);
          console.log('User logged out or no session');
        }
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      try {
        console.log('Checking for existing session');
        const { data } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        setSession(data.session);
        
        if (data.session?.user) {
          console.log('Found existing session for user:', data.session.user.id);
          setUserFromSession(data.session);
        } else {
          console.log('No existing session found');
          setUser(null);
        }
      } catch (error) {
        console.error("Error getting session:", error);
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

  // Separate effect for fetching user profile to avoid loops
  useEffect(() => {
    if (!user?.id || !session) return;
    
    let mounted = true;
    let profileTimer: NodeJS.Timeout | null = null;
    
    const loadUserProfile = async () => {
      try {
        console.log('Fetching profile for user:', user.id);
        const profile = await fetchUserProfile(user.id);
        
        if (!mounted) return;
        
        if (profile) {
          console.log('Profile found:', profile);
          setUser(prevUser => enrichUserWithProfile(prevUser, profile));
        }
      } catch (error) {
        console.error('Error getting user profile:', error);
      }
    };

    // Use setTimeout to avoid recursive RLS issues
    profileTimer = setTimeout(() => {
      if (mounted) loadUserProfile();
    }, 100);

    return () => {
      mounted = false;
      if (profileTimer) clearTimeout(profileTimer);
    };
  }, [user?.id, session, setUser]);
}
