/**
 * useIsAdmin – club-scoped admin check
 * - True if user is club creator OR has active membership with role in ('admin','editor')
 * - Centralized club_members access via helpers to reduce duplication and thrash
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchMembership,
  fetchUserRole,
} from "@/integrations/supabase/clubMembers";

export function useIsAdmin(clubId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["isAdmin", clubId, user?.id],
    enabled: !!clubId && !!user?.id,
    staleTime: 5_000,
    queryFn: async (): Promise<boolean> => {
      if (!clubId || !user?.id) return false;

      // 1) Creator path (fast path, uses clubs with policy allowing select)
      const { data: creatorRow, error: creatorErr } = await supabase
        .from("clubs")
        .select("id")
        .eq("id", clubId)
        .eq("created_by", user.id)
        .maybeSingle();

      if (creatorErr) {
        console.warn("[useIsAdmin] creator check error", String(creatorErr));
      }
      if (creatorRow) return true;

      // 2) Membership path via helpers
      try {
        const [role, membership] = await Promise.all([
          fetchUserRole(user.id, clubId),
          fetchMembership(user.id, clubId),
        ]);

        const isActive = membership?.status === "active";
        const isAdminOrEditor = role === "admin" || role === "editor";
        return Boolean(isActive && isAdminOrEditor);
      } catch (err) {
        console.warn("[useIsAdmin] membership/role check error", String(err));
        return false;
      }
    },
  });
}

export default useIsAdmin;
