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

    const THROTTLE_MS = 30_000;
    let lastRun = 0;
    let trailing: number | null = null;

    const run = () => {
      if (document.hidden) return;
      const now = Date.now();
      const elapsed = now - lastRun;
      if (elapsed >= THROTTLE_MS) {
        lastRun = now;
        void qc.refetchQueries({ type: "active" });
      } else if (trailing == null) {
        trailing = window.setTimeout(() => {
          trailing = null;
          lastRun = Date.now();
          if (!document.hidden) void qc.refetchQueries({ type: "active" });
        }, THROTTLE_MS - elapsed);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") run();
    };

    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", onVisibility);
      if (trailing != null) clearTimeout(trailing);
    };
  }, [enabled, qc]);

  return null;
}
