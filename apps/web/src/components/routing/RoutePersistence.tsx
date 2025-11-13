/**
 * RoutePersistence
 * - Saves the last private route (pathname + search) into localStorage.
 * - Skips public pages and onboarding.
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

export default function RoutePersistence() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

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
