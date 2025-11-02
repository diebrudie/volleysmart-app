import * as React from "react";
import { useLocation } from "react-router-dom";
import { useIsCompact } from "@/hooks/use-compact";
import { default as MobileChrome } from "./MobileChrome"; // only for PUBLIC_PREFIXES helper? (we won't import it)

const PUBLIC_PREFIXES = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/players/onboarding",
];

function isPublic(pathname: string) {
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

/** Adds flow-space at page bottom on compact screens so fixed bottom nav doesn't cover content. */
const MobileBottomSpacer: React.FC = () => {
  const isCompact = useIsCompact();
  const { pathname } = useLocation();
  if (!isCompact || isPublic(pathname)) return null;
  return <div className="h-24" aria-hidden="true" />;
};

export default MobileBottomSpacer;
