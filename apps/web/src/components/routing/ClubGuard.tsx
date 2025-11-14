import { Navigate, useParams } from "react-router-dom";
import { PropsWithChildren, useEffect } from "react";
import { useClub } from "@/contexts/ClubContext";

/**
 * Blocks access to club-scoped pages unless the user is an ACTIVE member
 * of the :clubId in the current route. Redirects to /clubs otherwise.
 *
 * IMPORTANT: while ClubContext is validating membership (initial boot or when
 * switching into a club), we render nothing to avoid a flicker-then-redirect.
 */
export default function ClubGuard({ children }: PropsWithChildren) {
  const {
    clubId: ctxClubId,
    membershipStatus,
    initialized,
    isValidatingClub, // NEW
    setClubId,
  } = useClub();
  const { clubId: routeClubId } = useParams<{ clubId: string }>();

  // Keep context aligned with the route; validation happens inside setClubId
  useEffect(() => {
    if (routeClubId && routeClubId !== ctxClubId) {
      setClubId(routeClubId);
    }
  }, [routeClubId, ctxClubId, setClubId]);

  // Wait for initial resolution and any active validation to finish
  if (!initialized || isValidatingClub || membershipStatus === null) {
    return null; // don’t redirect yet
  }

  const isActiveForRoute =
    membershipStatus === "active" && !!ctxClubId && ctxClubId === routeClubId;

  if (!isActiveForRoute) {
    // Not active (pending/rejected/none) or context mismatches the route → block
    return <Navigate to="/clubs" replace />;
  }

  return <>{children}</>;
}
