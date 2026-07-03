import { type PropsWithChildren, useEffect, useState } from "react";
import { useRouter, useSegments } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@volleysmart/core";
import { supabase } from "@/constants/supabase";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/constants/queryKeys";

/**
 * Route guard:
 * - unauthenticated → (auth)/login
 * - authenticated without a players row → /onboarding
 * - authenticated with a players row → (tabs) (when parked in (auth) or /onboarding)
 *
 * PASSWORD_RECOVERY guard (see hooks/useDeepLinkAuth.ts JSDoc): while a
 * recovery session is active and the user is inside the (auth) group
 * (reset-password screen), do NOT bounce them to (tabs) until the reset
 * finishes (USER_UPDATED) or they sign out.
 */
export function AuthProvider({ children }: PropsWithChildren) {
  const { session, user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [recoveryPending, setRecoveryPending] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryPending(true);
      } else if (event === "USER_UPDATED" || event === "SIGNED_OUT") {
        // Password reset completed (or session ended) — release the guard.
        setRecoveryPending(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Lean player-row existence check. Same key + queryFn shape as
  // hooks/useCurrentPlayerId so the caches are shared; the onboarding
  // wizard seeds this key on completion.
  const playerIdQuery = useQuery({
    queryKey: queryKeys.profile.currentPlayerId(user?.id),
    queryFn: async () => {
      const { data } = await getSupabaseClient()
        .from("players")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data?.id ?? null;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  });

  const inAuthGroup = segments[0] === "(auth)";
  // Typed segments may lag behind new route files — compare as plain string.
  const inOnboarding = (segments[0] as string) === "onboarding";
  const onResetPassword = inAuthGroup && segments[1] === "reset-password";

  useEffect(() => {
    if (loading) return;

    if (!session) {
      if (!inAuthGroup) router.replace("/(auth)/login");
      return;
    }

    // Recovery flow: keep the user inside the auth group until the
    // password reset is finished.
    if (inAuthGroup && (recoveryPending || onResetPassword)) return;

    // Wait for the player-row check before choosing a destination.
    if (playerIdQuery.isPending) return;

    const hasPlayer = !!playerIdQuery.data;
    if (!hasPlayer && !inOnboarding) {
      router.replace("/onboarding" as never);
    } else if (hasPlayer && (inAuthGroup || inOnboarding)) {
      router.replace("/(tabs)");
    }
  }, [
    session,
    loading,
    inAuthGroup,
    inOnboarding,
    onResetPassword,
    recoveryPending,
    playerIdQuery.isPending,
    playerIdQuery.data,
    router,
  ]);

  if (loading) return null;

  return <>{children}</>;
}
