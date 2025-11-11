import React from "react";
import { useIsCompact } from "@/hooks/use-compact";
import { useLocation } from "react-router-dom";
import MobileTopBar from "./MobileTopBar";
import MobileBottomNav from "./MobileBottomNav";

/**
 * Public routes should not show the mobile chrome (top/bottom bars).
 * Keep in sync with ThemeProvider's enforceLightOnRoutes.
 */
const PUBLIC_PREFIXES = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/players/onboarding",
];

// Routes that must NOT show mobile chrome (top + bottom)
const HIDE_CHROME = [
  /^\/new-game\/[^/]+$/, // /new-game/:clubId
  /^\/edit-game\/[^/]+\/[^/]+\/?$/,
  /^\/join-club\/?$/, // /join-club
  /^\/new-club\/?$/, // /new-club
  /^\/user\/[^/]+\/?$/, // /user/:userId (Profile)
];

function isPublic(pathname: string): boolean {
  const p =
    pathname.endsWith("/") && pathname !== "/"
      ? pathname.slice(0, -1)
      : pathname;
  return PUBLIC_PREFIXES.some((prefix) => {
    const pp =
      prefix.endsWith("/") && prefix !== "/" ? prefix.slice(0, -1) : prefix;
    return p === pp || p.startsWith(pp + "/");
  });
}

/** Renders TopBar + BottomNav only on compact screens and non-public routes. */
const MobileChrome: React.FC = () => {
  const isCompact = useIsCompact();
  const { pathname } = useLocation();

  if (!isCompact) return null;
  if (isPublic(pathname)) return null;

  // Suppress chrome on editor/join/new-club pages
  if (HIDE_CHROME.some((rx) => rx.test(pathname))) return null;

  return (
    <>
      <MobileTopBar />
      <MobileBottomNav />
    </>
  );
};

export default MobileChrome;
