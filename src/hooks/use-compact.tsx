import * as React from "react";

/**
 * Define isomorphic layout effect ONCE at module scope.
 * - In the browser: useLayoutEffect (runs before paint)
 * - On the server / non-DOM: falls back to useEffect (avoids SSR warnings)
 * This keeps the hook identity stable across renders.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" && typeof document !== "undefined"
    ? React.useLayoutEffect
    : React.useEffect;

/**
 * useIsCompact — true for screens smaller than Tailwind's lg (1024px).
 * Initializes synchronously to reduce first-frame flicker on mobile.
 */
export function useIsCompact(): boolean {
  // Read synchronously on first render (if window exists)
  const getMatch = (): boolean =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 1023px)").matches // < lg
      : false;

  const [isCompact, setIsCompact] = React.useState<boolean>(getMatch);

  useIsomorphicLayoutEffect(() => {
    // Guard if somehow called in a non-DOM env
    if (typeof window === "undefined") return;

    const mql = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setIsCompact(mql.matches);

    // Sync in case the first render was before this effect ran
    setIsCompact(mql.matches);

    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isCompact;
}
