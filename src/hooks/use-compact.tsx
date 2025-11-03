import * as React from "react";

/**
 * useIsCompact — true for screens smaller than Tailwind's lg (1024px).
 * Initialize synchronously to avoid first-frame flicker on mobile.
 */
export function useIsCompact(): boolean {
  // Read synchronously on first render (if window exists)
  const getMatch = () =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 1023px)").matches // < lg
      : false;

  const [isCompact, setIsCompact] = React.useState<boolean>(getMatch);

  // Use layout effect so React commits with the correct value before paint
  const useIsoLayoutEffect =
    typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

  useIsoLayoutEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setIsCompact(mql.matches);

    // In case something changed between initial render and now
    setIsCompact(mql.matches);

    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isCompact;
}
