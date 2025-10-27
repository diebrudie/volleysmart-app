import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import RealtimeAppEffect from "@/components/common/RealtimeAppEffect";

export default function AppLiveRefresh() {
  const qc = useQueryClient();
  const { isAuthenticated } = useAuth();

  // Mount realtime logic (inside Router via App.tsx)
  // No hooks-in-hooks, no navigate injection, zero hook-order risk.
  // RealtimeAppEffect itself uses useNavigate safely (it lives under BrowserRouter).
  return (
    <>
      <RealtimeAppEffect />
      <FocusOnlineRefetch enabled={isAuthenticated} />
    </>
  );
}

function FocusOnlineRefetch({ enabled }: { enabled: boolean }) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    const refetchActive = () => {
      void qc.refetchQueries({ type: "active" });
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refetchActive();
    };
    window.addEventListener("online", refetchActive);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("online", refetchActive);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, qc]);

  return null;
}
