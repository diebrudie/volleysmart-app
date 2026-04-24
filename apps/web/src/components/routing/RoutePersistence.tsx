/**
 * RoutePersistence
 * - Saves the last private route (pathname + search) into localStorage.
 * - Skips public pages and onboarding.
 * - Captures invite tokens from `/invite/:token` into localStorage so
 *   users can complete signup/onboarding and still accept the invite later.
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

const PENDING_INVITE_TOKEN_KEY = "pendingInviteToken";

export default function RoutePersistence() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  /**
   * Capture invite tokens from /invite/:token path.
   * Persists across signup/onboarding so the user can accept afterwards.
   */
  useEffect(() => {
    const inviteMatch = location.pathname.match(/^\/invite\/([^/]+)$/);
    if (inviteMatch?.[1]) {
      localStorage.setItem(PENDING_INVITE_TOKEN_KEY, inviteMatch[1].trim());
    }
  }, [location.pathname]);

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
