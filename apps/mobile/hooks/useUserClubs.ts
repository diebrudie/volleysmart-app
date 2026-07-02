import { useQuery } from "@tanstack/react-query";
import {
  fetchActiveMemberClubsWithDetails,
  type MemberClubWithDetails,
} from "@volleysmart/core";
import { useAuth } from "./useAuth";

export function useUserClubs() {
  const { user } = useAuth();
  return useQuery<MemberClubWithDetails[]>({
    queryKey: ["user-clubs", user?.id],
    queryFn: () => fetchActiveMemberClubsWithDetails(user!.id),
    enabled: !!user?.id,
  });
}
