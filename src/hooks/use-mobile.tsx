import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * useIsMobile — < 768px. Initialize synchronously to prevent a first-frame desktop render.
 */
export function useIsMobile(): boolean {
  const getMatch = () =>
    typeof window !== "undefined"
      ? window.innerWidth < MOBILE_BREAKPOINT
      : false;

  const [isMobile, setIsMobile] = React.useState<boolean>(getMatch);

  const useIsoLayoutEffect =
    typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

  useIsoLayoutEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    // Sync immediately in case of a resize before mount
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
