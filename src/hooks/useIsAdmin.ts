import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useIsAdmin(clubId?: string) {
  return useQuery({
    queryKey: ["clubAdminFlag", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      // Keep in sync with your current Members.tsx check
      const { data, error } = await supabase
        .from("club_members")
        .select("role")
        .eq("club_id", clubId)
        .eq("is_active", true)
        .limit(1);

      if (error) throw error;
      const row = (data ?? [])[0] as { role?: string } | undefined;
      return row?.role === "admin";
    },
  });
}
