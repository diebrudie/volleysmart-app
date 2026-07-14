import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";
import { useAuth } from "./useAuth";

export function useIsAdmin(clubId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.clubs.isAdmin(clubId ?? undefined, user?.id),
    enabled: !!clubId && !!user?.id,
    staleTime: 5_000,
    queryFn: async (): Promise<boolean> => {
      if (!clubId || !user?.id) return false;

      const supabase = getSupabaseClient();

      const { data: creatorRow } = await supabase
        .from("clubs")
        .select("id")
        .eq("id", clubId)
        .eq("created_by", user.id)
        .maybeSingle();

      if (creatorRow) return true;

      const { data: membership } = await supabase
        .from("club_members")
        .select("role, status")
        .eq("club_id", clubId)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!membership) return false;
      return (
        membership.status === "active" &&
        (membership.role === "admin" || membership.role === "editor")
      );
    },
  });
}
