import { useQuery } from "@tanstack/react-query";
import { getPlayerByUserId } from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";
import { useAuth } from "./useAuth";

export function usePlayerProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.profile.player(user?.id),
    queryFn: () => getPlayerByUserId(user!.id),
    enabled: !!user?.id,
  });
}
