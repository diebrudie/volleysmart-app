/**
 * useRealtimeInvalidation — Supabase Realtime -> react-query invalidation.
 *
 * Mobile port of the four live-update channels in
 * apps/web/src/components/common/RealtimeAppEffect.tsx + AppLiveRefresh.tsx:
 *   1. club_members (user-scoped)  -> membership + game/event queries
 *   2. club-scoped tables (match_days, matches, game_players, club_members)
 *      for every club the user belongs to (mobile has no single "current
 *      club" context, so we subscribe per membership club id)
 *   3. notifications INSERT (user-scoped) -> list + unread badge in TopBar
 *   4. AppState "active" -> refetch active queries (throttled 30s), the
 *      native replacement for the web visibility/online handlers
 *
 * Defensive by design: realtime failures must never crash the app, so all
 * channel setup is wrapped in try/catch and errors are only logged.
 */
import { useEffect, useMemo } from "react";
import { AppState } from "react-native";
import { useQueryClient, type Query } from "@tanstack/react-query";
import { getSupabaseClient } from "@volleysmart/core";
import { useAuth } from "./useAuth";
import { useUserClubs } from "./useUserClubs";

const REFETCH_THROTTLE_MS = 30_000;

/** Query-key roots refreshed when club membership changes. */
const MEMBERSHIP_FAMILIES = new Set<string>([
  "user-clubs",
  "club-members",
  "club-detail",
  "club-member-count",
  "club-role",
  "isAdmin",
  "members-global",
  "members-manage",
  "club-invites",
]);

/** Query-key roots refreshed when games / events change. */
const GAME_FAMILIES = new Set<string>([
  "upcoming-events",
  "past-events",
  "event-detail",
  "event-attendees",
  "club-events",
  "club-stats",
  "player-stats",
  "home-todays-event",
  "home-last-game",
  "home-monthly-stats",
]);

function getClient() {
  try {
    return getSupabaseClient();
  } catch {
    return null;
  }
}

export function useRealtimeInvalidation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  const { data: clubs } = useUserClubs();

  // Stable string dep so effect only re-subscribes when membership changes.
  const clubIdsKey = useMemo(
    () =>
      (clubs ?? [])
        .map((c) => c.club_id)
        .filter(Boolean)
        .sort()
        .join(","),
    [clubs]
  );

  const invalidateFamilies = useMemo(() => {
    return (families: Set<string>) => {
      qc.invalidateQueries({
        predicate: (q: Query) => {
          const key = q.queryKey;
          if (!Array.isArray(key) || key.length === 0) return false;
          return families.has(String(key[0] ?? ""));
        },
      }).catch(() => {});
    };
  }, [qc]);

  // 1) Current user's memberships — keeps clubs/home live on approval/removal
  useEffect(() => {
    if (!userId) return;
    const supabase = getClient();
    if (!supabase) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`rt:club_members:user:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "club_members",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            // Membership gain/loss affects both club and event visibility.
            invalidateFamilies(MEMBERSHIP_FAMILIES);
            invalidateFamilies(GAME_FAMILIES);
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("[realtime] club_members(user) subscribe failed", err);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      }
    };
  }, [userId, invalidateFamilies]);

  // 2) Club-scoped tables for every club the user belongs to
  useEffect(() => {
    if (!userId || !clubIdsKey) return;
    const supabase = getClient();
    if (!supabase) return;

    const clubIds = clubIdsKey.split(",").filter(Boolean);
    const channels: ReturnType<typeof supabase.channel>[] = [];

    for (const clubId of clubIds) {
      try {
        let channel = supabase.channel(`rt:club:${clubId}`);
        for (const table of ["match_days", "matches", "game_players"]) {
          channel = channel.on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table,
              filter: `club_id=eq.${clubId}`,
            },
            () => invalidateFamilies(GAME_FAMILIES)
          );
        }
        // Admin membership views (pending requests etc.)
        channel = channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "club_members",
            filter: `club_id=eq.${clubId}`,
          },
          () => invalidateFamilies(MEMBERSHIP_FAMILIES)
        );
        channels.push(channel.subscribe());
      } catch (err) {
        console.warn(`[realtime] club channel failed (${clubId})`, err);
      }
    }

    return () => {
      for (const ch of channels) {
        try {
          supabase.removeChannel(ch);
        } catch {
          // ignore
        }
      }
    };
  }, [userId, clubIdsKey, invalidateFamilies]);

  // 3) Notifications — drives the TopBar unread badge live
  useEffect(() => {
    if (!userId) return;
    const supabase = getClient();
    if (!supabase) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`rt:notifications:user:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            qc.invalidateQueries({ queryKey: ["notifications", userId] }).catch(
              () => {}
            );
            qc.invalidateQueries({
              queryKey: ["unreadNotificationCount", userId],
            }).catch(() => {});
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("[realtime] notifications subscribe failed", err);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      }
    };
  }, [userId, qc]);

  // 4) App foreground refetch (throttled) — replaces web visibility handler
  useEffect(() => {
    if (!userId) return;

    let lastRun = 0;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      const now = Date.now();
      if (now - lastRun < REFETCH_THROTTLE_MS) return;
      lastRun = now;
      qc.refetchQueries({ type: "active" }).catch(() => {});
    });

    return () => subscription.remove();
  }, [userId, qc]);
}
