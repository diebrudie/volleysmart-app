/**
 * RealtimeAppEffect
 * Mounted once inside the Router; wires Supabase realtime for:
 *  - club_members (user-scoped & club-scoped for admin views)
 *  - match_days, matches, game_players (club-scoped)
 * Also redirects out of a club immediately on membership loss.
 */
import { useEffect, useMemo } from "react";
import { useQueryClient, Query } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import { useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type ClubMembersRow = Database["public"]["Tables"]["club_members"]["Row"];
type MatchDaysRow = Database["public"]["Tables"]["match_days"]["Row"];
type MatchesRow = Database["public"]["Tables"]["matches"]["Row"];
type GamePlayersRow = Database["public"]["Tables"]["game_players"]["Row"];

export default function RealtimeAppEffect() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { clubId, clearClubId } = useClub();
  const navigate = useNavigate();

  // Families of query keys we refresh across the app
  //adding this
  const families = useMemo(
    () =>
      new Set<string>([
        "userClubs",
        "clubMembers",
        "pendingRequestsCount",
        "members.manage",
        "clubMeta",
        "matchDays",
        "matches",
        "currentMatch",
        "teams",
        "scoreboard",
        "leaderboard",
      ]),
    []
  );

  const invalidateFamilies = useMemo(() => {
    return async (maybeClubId?: string | null) => {
      const cid = maybeClubId ?? clubId ?? null;
      await qc.invalidateQueries({
        predicate: (q: Query) => {
          const key = q.queryKey;
          if (!Array.isArray(key) || key.length === 0) return false;
          const family = String(key[0] ?? "");
          if (!families.has(family)) return false;

          // Always refresh /clubs list immediately regardless of clubId
          if (family === "userClubs") return true;

          // For all other families, prefer club-scoped invalidation
          return cid ? key.includes(cid) : true;
        },
      });
    };
  }, [qc, families, clubId]);

  // 1) Current user's memberships → make /clubs live (approval/removal)
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    const ch = supabase
      .channel(`rt:club_members:user:${userId}`)
      .on<ClubMembersRow>(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "club_members",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const newRow = (payload.new ?? null) as ClubMembersRow | null;
          const oldRow = (payload.old ?? null) as ClubMembersRow | null;

          const club_id = newRow?.club_id ?? oldRow?.club_id ?? null;
          const becameActive =
            oldRow?.status !== "active" && newRow?.status === "active";
          const lostAccess =
            (oldRow?.is_active ?? false) === true &&
            (newRow?.is_active ?? true) === false;

          await invalidateFamilies(club_id);

          // If we’re inside this club and lost access → leave immediately
          if (
            clubId &&
            club_id === clubId &&
            (lostAccess || newRow?.status === "rejected")
          ) {
            clearClubId();
            navigate("/clubs", { replace: true });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, clubId, invalidateFamilies, clearClubId, navigate]);

  // 2) Club-scoped tables → matches/teams/scoreboard live updates + admin membership view
  useEffect(() => {
    if (!clubId) return;

    const subscribe = <T,>(table: string) =>
      supabase
        .channel(`rt:${table}:club:${clubId}`)
        .on<T>(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            filter: `club_id=eq.${clubId}`,
          },
          async () => {
            await invalidateFamilies(clubId);
          }
        )
        .subscribe();

    const ch1 = subscribe<MatchDaysRow>("match_days");
    const ch2 = subscribe<MatchesRow>("matches");
    const ch3 = subscribe<GamePlayersRow>("game_players");

    // Also refresh admin membership UIs (pending requests etc.)
    const chMembersByClub = supabase
      .channel(`rt:club_members:club:${clubId}`)
      .on<ClubMembersRow>(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "club_members",
          filter: `club_id=eq.${clubId}`,
        },
        async () => {
          await invalidateFamilies(clubId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
      supabase.removeChannel(ch3);
      supabase.removeChannel(chMembersByClub);
    };
  }, [clubId, invalidateFamilies]);

  // 3) Failsafe: verify membership occasionally when Realtime is quiet.
  //    - Only runs when online
  //    - Backs off from 30s → 60s → 120s on stability
  //    - Resets to 30s after navigation focus/visibility
  useEffect(() => {
    if (!user?.id || !clubId) return;

    let cancelled = false;
    let timer: number | undefined;
    let intervalMs = 30_000; // start modest; will back off

    const scheduleNext = () => {
      if (cancelled) return;
      timer = window.setTimeout(check, intervalMs);
    };

    const check = async () => {
      if (cancelled) return;

      // Skip if offline to avoid auth refresh noise & console errors
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        scheduleNext();
        return;
      }

      const { data, error } = await supabase
        .from("club_members")
        .select("status,is_active")
        .eq("user_id", user.id)
        .eq("club_id", clubId)
        .maybeSingle();

      if (cancelled) return;

      const stillActive =
        !!data && data.status === "active" && data.is_active !== false;

      if (!stillActive || error) {
        clearClubId();
        navigate("/clubs", { replace: true });
        return;
      }

      // backoff: 30s → 60s → 120s (cap)
      intervalMs = Math.min(intervalMs * 2, 120_000);
      scheduleNext();
    };

    // Initial run soon (but not immediately)
    timer = window.setTimeout(check, 5_000);

    // Reset backoff on focus/visibility so app feels snappy after returning
    const onFocus = () => {
      intervalMs = 30_000;
      void check();
    };
    window.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [user?.id, clubId, clearClubId, navigate]);

  return null;
}
