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
  /^\/new-game\/[^/]+$/, // /new-game/:clubId (legacy)
  /^\/edit-game\/[^/]+\/[^/]+\/?$/,
  /^\/events\/new\/?$/, // Create Event flow
  /^\/events\/[^/]+\/?$/, // /events/:eventId (Event Detail)
  /^\/clubs\/[^/]+\/?$/, // /clubs/:clubId (Club Overview)
  /^\/game\/[^/]+\/?$/, // /game/:matchDayId (Game page)

  /^\/new-club\/?$/, // /new-club
  /^\/user\/[^/]+\/?$/, // /user/:userId (Profile)
  /^\/manage-requests\/?$/, // /manage-requests
  /^\/notifications\/?$/, // /notifications
  /^\/faqs\/?$/, // /faqs
  /^\/start\/?$/, // redirects to /home
  /^\/invite-members(\/[^/]+)?\/?$/,
  /^\/invite\/[^/]+\/?$/, // /invite/:token (invite link)
];

// Routes where we want the top bar only (no bottom nav),
// e.g. FAQs from inside the app
const HIDE_BOTTOM_ONLY: RegExp[] = [];

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

  // Suppress chrome entirely on editor/join/new-club pages
  if (HIDE_CHROME.some((rx) => rx.test(pathname))) return null;

  const hideBottom = HIDE_BOTTOM_ONLY.some((rx) => rx.test(pathname));

  if (hideBottom) {
    // e.g. /faqs → only top bar
    return <MobileTopBar />;
  }

  return (
    <>
      <MobileTopBar />
      <MobileBottomNav />
    </>
  );
};

export default MobileChrome;
