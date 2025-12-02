/**
 * RoutePersistence
 * - Saves the last private route (pathname + search) into localStorage.
 * - Skips public pages and onboarding.
 * - Additionally captures invite codes from `?cid=...` into localStorage so
 *   users can complete signup/onboarding and still join the invited club later.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const PUBLIC_PATHS = new Set<string>([
  "/",
  "/login",
  "/signup",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
]);

const EXCLUDED_PRIVATE_PATHS = new Set<string>([
  "/players/onboarding", // don't persist onboarding as last route
]);

const PENDING_CLUB_JOIN_KEY = "pendingClubJoinSlug";

export default function RoutePersistence() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  /**
   * Always capture `cid` from the query string (even when not authenticated).
   * This supports flows like:
   *  - share link: https://volleysmart.app/?cid=ABC12
   *  - user signs up, completes onboarding
   *  - later chooses "Join a Club" and sees the invite prefilled.
   */
  useEffect(() => {
    const search = location.search;
    if (!search) return;

    const params = new URLSearchParams(search);
    const cid = params.get("cid");

    if (cid && cid.trim()) {
      localStorage.setItem(PENDING_CLUB_JOIN_KEY, cid.trim());
    }
  }, [location.search]);

  /**
   * Persist last private path (existing behavior), only when authenticated.
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    const path = location.pathname;
    if (PUBLIC_PATHS.has(path)) return;

    // Skip excluded private paths (prefix check allows for params like /players/onboarding?step=2)
    for (const excluded of EXCLUDED_PRIVATE_PATHS) {
      if (path.startsWith(excluded)) return;
    }

    const value = path + (location.search || "");
    localStorage.setItem("lastPrivatePath", value);
  }, [isAuthenticated, location.pathname, location.search]);

  return null;
}
