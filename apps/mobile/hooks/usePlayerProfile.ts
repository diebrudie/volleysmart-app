import { useQuery } from "@tanstack/react-query";
import { getPlayerByUserId } from "@volleysmart/core";
import { useAuth } from "./useAuth";

export function usePlayerProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["player-profile", user?.id],
    queryFn: () => getPlayerByUserId(user!.id),
    enabled: !!user?.id,
  });
}
