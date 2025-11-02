import * as React from "react";
import { useLocation } from "react-router-dom";
import { useIsCompact } from "@/hooks/use-compact";

const PUBLIC_PREFIXES = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/players/onboarding",
];

// Routes that should NOT show any mobile chrome or spacer
const HIDE_SPACER = [
  /^\/new-game\/[^/]+\/?$/,
  /^\/edit-game\/[^/]+\/[^/]+\/?$/,
  /^\/join-club\/?$/,
  /^\/new-club\/?$/,
];

const normalize = (p: string) =>
  p.endsWith("/") && p !== "/" ? p.slice(0, -1) : p;

function isPublic(pathname: string) {
  const p = normalize(pathname);
  return PUBLIC_PREFIXES.some((prefix) => {
    const pp = normalize(prefix);
    return p === pp || p.startsWith(pp + "/");
  });
}

function shouldHideChrome(pathname: string) {
  return HIDE_SPACER.some((rx) => rx.test(pathname));
}

/** Adds vertical space so the fixed bottom nav doesn't overlap content on compact screens. */
const MobileBottomSpacer: React.FC = () => {
  const isCompact = useIsCompact();
  const { pathname } = useLocation();

  if (!isCompact) return null;
  if (isPublic(pathname)) return null;
  if (shouldHideChrome(pathname)) return null;

  return <div className="h-24" aria-hidden="true" />;
};

export default MobileBottomSpacer;
