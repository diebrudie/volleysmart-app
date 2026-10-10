import { useNavigate } from "react-router-dom";

/**
 * Back navigation that never dead-ends. React Router stores the history index
 * in history.state.idx; idx 0 means this is the first in-app entry (e.g. a PWA
 * cold launch restored to this route), so navigate(-1) would do nothing.
 */
export function useGoBack(fallback = "/home") {
  const navigate = useNavigate();
  return () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  };
}
