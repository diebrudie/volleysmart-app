import * as React from "react";

/**
 * useIsCompact — true for screens smaller than Tailwind's lg (1024px).
 * We keep it local to mobile chrome to avoid changing any existing "mobile" logic.
 */
export function useIsCompact(): boolean {
  const [isCompact, setIsCompact] = React.useState<boolean>(false);

  React.useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)"); // < lg
    const onChange = () => setIsCompact(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isCompact;
}
