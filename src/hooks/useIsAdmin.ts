/**
 * useIsAdmin – club-scoped admin check
 * - True if user is club creator OR has active membership with role in ('admin','editor')
 * - Emits debug logs to trace decisions
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useIsAdmin(clubId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["isAdmin", clubId, user?.id],
    queryFn: async () => {
      // 1) Creator path (policy “creators_or_members_can_select_clubs” allows this SELECT)
      const { data: creatorRow, error: creatorErr } = await supabase
        .from("clubs")
        .select("id")
        .eq("id", clubId)
        .eq("created_by", user.id)
        .maybeSingle();

      if (creatorErr) {
        console.warn("[useIsAdmin] creator check error", String(creatorErr));
      }
      if (creatorRow) {
        return true;
      }

      // 2) Membership path
      const { data: membershipRow, error: memberErr } = await supabase
        .from("club_members")
        .select("id, role, status")
        .eq("club_id", clubId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .in("role", ["admin", "editor"])
        .maybeSingle();

      if (memberErr) {
        console.warn("[useIsAdmin] membership check error", String(memberErr));
      }

      const ok = !!membershipRow;
      return ok;
    },
    enabled: !!clubId && !!user?.id,
    staleTime: 5_000,
  });
}

export default useIsAdmin;
