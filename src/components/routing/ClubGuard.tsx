import { Navigate, useParams } from "react-router-dom";
import { PropsWithChildren, useEffect } from "react";
import { useClub } from "@/contexts/ClubContext";

/**
 * Blocks access to club-scoped pages unless the user is an ACTIVE member
 * of the :clubId in the current route. Redirects to /clubs otherwise.
 */
export default function ClubGuard({ children }: PropsWithChildren) {
  const {
    clubId: ctxClubId,
    membershipStatus,
    initialized,
    setClubId,
  } = useClub();
  const { clubId: routeClubId } = useParams<{ clubId: string }>();

  // Keep context aligned with the route; validation happens inside setClubId
  useEffect(() => {
    if (routeClubId && routeClubId !== ctxClubId) {
      setClubId(routeClubId);
    }
  }, [routeClubId, ctxClubId, setClubId]);

  // Wait for initial membership resolution to avoid flicker
  if (!initialized) return null;

  const isActiveForRoute =
    membershipStatus === "active" && !!ctxClubId && ctxClubId === routeClubId;

  if (!isActiveForRoute) {
    // If user is not active (pending/rejected/none) or context mismatches the route → block
    return <Navigate to="/clubs" replace />;
  }

  return <>{children}</>;
}
