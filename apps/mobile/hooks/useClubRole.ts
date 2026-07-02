import { useQuery } from "@tanstack/react-query";
import { fetchUserRole } from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";
import { useAuth } from "./useAuth";

export type ClubRole = "admin" | "editor" | "member" | "none";

/**
 * Role of the current user in a club.
 * Resolves to "none" when the user has no club_members row.
 */
export function useClubRole(clubId?: string | null) {
  const { user } = useAuth();

  return useQuery<ClubRole>({
    queryKey: queryKeys.clubs.role(clubId ?? undefined, user?.id),
    enabled: !!clubId && !!user?.id,
    staleTime: 5_000,
    queryFn: async (): Promise<ClubRole> => {
      if (!clubId || !user?.id) return "none";
      const role = await fetchUserRole(user.id, clubId);
      return role ?? "none";
    },
  });
}
