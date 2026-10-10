import { Navigate, useParams } from "react-router-dom";
import { PropsWithChildren, useEffect, useRef } from "react";
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
    isValidatingClub,
    setClubId,
  } = useClub();
  const { clubId: routeClubId } = useParams<{ clubId: string }>();

  // Validate each route club once; a failed check resets ctxClubId to null,
  // which must not trigger another validation (infinite loop, blank page).
  const requestedRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      routeClubId &&
      routeClubId !== ctxClubId &&
      requestedRef.current !== routeClubId
    ) {
      requestedRef.current = routeClubId;
      setClubId(routeClubId);
    }
  }, [routeClubId, ctxClubId, setClubId]);

  // Wait for initial resolution and any active validation to finish
  if (!initialized || isValidatingClub) {
    return null; // don’t redirect yet
  }

  // Validation for this route hasn't started yet (effect runs after render)
  if (routeClubId !== ctxClubId && requestedRef.current !== routeClubId) {
    return null;
  }

  const isActiveForRoute =
    membershipStatus === "active" && !!ctxClubId && ctxClubId === routeClubId;

  if (!isActiveForRoute) {
    // Not active (pending/rejected/none) or context mismatches the route → block
    return <Navigate to="/clubs" replace />;
  }

  return <>{children}</>;
}
