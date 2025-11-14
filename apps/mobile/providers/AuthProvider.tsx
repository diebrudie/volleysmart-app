/**
 * AuthProvider (mobile):
 * - Listens to Supabase auth changes
 * - Stores session via AsyncStorage (handled by supabase-js)
 * - Routes user into (auth) or (tabs) stacks
 */
import { PropsWithChildren, useEffect, useState } from "react";
import { supabase } from "@/constants/supabase";
import { useRouter, useSegments } from "expo-router";
import type { Session } from "@supabase/supabase-js";

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const segments = useSegments(); // e.g., ["(auth)","login"] or ["(tabs)","index"]
  const router = useRouter();

  useEffect(() => {
    // Load current session on boot
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    // Subscribe to changes (includes OAuth callback completion)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Gate routing based on session:
    const inAuthGroup = segments[0] === "(auth)";
    if (!session && !inAuthGroup) {
      router.replace("(auth)/login");
    } else if (session && inAuthGroup) {
      router.replace("(tabs)");
    }
  }, [session, segments, router]);

  return children as JSX.Element;
}
