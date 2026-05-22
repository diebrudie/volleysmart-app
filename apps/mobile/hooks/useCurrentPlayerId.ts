import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@volleysmart/core";
import { useAuth } from "./useAuth";

export function useCurrentPlayerId() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["current-player-id", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await getSupabaseClient()
        .from("players")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      return data?.id ?? null;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  });
}
