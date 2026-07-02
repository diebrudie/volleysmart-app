/**
 * Central react-query key registry.
 *
 * IMPORTANT: The literal key strings for existing hooks (upcoming-events,
 * event-detail, user-clubs, club-members, club-events, player-profile,
 * current-player-id, isAdmin, unreadNotificationCount) are kept byte-identical
 * to the current apps/mobile/hooks/*.ts keys so hooks can migrate to this
 * registry without any cache-invalidation surprises.
 *
 * Prefix invalidation: pass the namespace root, e.g.
 *   queryClient.invalidateQueries({ queryKey: queryKeys.events.allUpcoming })
 * matches every ["upcoming-events", ...] key.
 */

export const queryKeys = {
  events: {
    /** Existing: useUpcomingEvents -> ["upcoming-events", userId] */
    upcoming: (userId: string | undefined) =>
      ["upcoming-events", userId] as const,
    /** Prefix for invalidating all upcoming-events queries (used by useRsvpMutation). */
    allUpcoming: ["upcoming-events"] as const,
    /** Existing: useEventDetail -> ["event-detail", eventId] */
    detail: (eventId: string | undefined) => ["event-detail", eventId] as const,
    allDetails: ["event-detail"] as const,
    past: (userId: string | undefined) => ["past-events", userId] as const,
    discover: (city?: string) => ["discover-events", city] as const,
    attendees: (eventId: string | undefined) =>
      ["event-attendees", eventId] as const,
    templates: (clubId: string | undefined) =>
      ["event-templates", clubId] as const,
  },

  clubs: {
    /** Existing: useUserClubs -> ["user-clubs", userId] */
    mine: (userId: string | undefined) => ["user-clubs", userId] as const,
    detail: (clubId: string | undefined) => ["club-detail", clubId] as const,
    /** Existing: useClubEvents -> ["club-events", clubId] */
    events: (clubId: string | undefined) => ["club-events", clubId] as const,
    /** Prefix for invalidating all club-events queries (used by useRsvpMutation). */
    allEvents: ["club-events"] as const,
    /** Existing: useClubMembers -> ["club-members", clubId] */
    members: (clubId: string | undefined) => ["club-members", clubId] as const,
    stats: (clubId: string | undefined) => ["club-stats", clubId] as const,
    guests: (clubId: string | undefined) => ["club-guests", clubId] as const,
    /** Existing: useIsAdmin -> ["isAdmin", clubId, userId] */
    isAdmin: (clubId: string | undefined, userId: string | undefined) =>
      ["isAdmin", clubId, userId] as const,
    role: (clubId: string | undefined, userId: string | undefined) =>
      ["club-role", clubId, userId] as const,
    memberCount: (clubId: string | undefined) =>
      ["club-member-count", clubId] as const,
    discover: (query?: string) => ["discover-clubs", query] as const,
  },

  members: {
    global: (userId: string | undefined) => ["members-global", userId] as const,
    manage: (clubId: string | undefined) =>
      ["members-manage", clubId] as const,
    invites: (clubId: string | undefined) =>
      ["club-invites", clubId] as const,
  },

  notifications: {
    /** Existing: useUnreadNotifications -> ["unreadNotificationCount", userId] */
    unreadCount: (userId: string | undefined) =>
      ["unreadNotificationCount", userId] as const,
    list: (userId: string | undefined) => ["notifications", userId] as const,
    preferences: (userId: string | undefined) =>
      ["notification-preferences", userId] as const,
  },

  profile: {
    /** Existing: usePlayerProfile -> ["player-profile", userId] */
    player: (userId: string | undefined) =>
      ["player-profile", userId] as const,
    /** Existing: useCurrentPlayerId -> ["current-player-id", userId] */
    currentPlayerId: (userId: string | undefined) =>
      ["current-player-id", userId] as const,
    stats: (playerId: string | undefined, clubId?: string) =>
      ["player-stats", playerId, clubId] as const,
  },

  home: {
    dashboard: (userId: string | undefined) =>
      ["home-dashboard", userId] as const,
  },
} as const;

export type QueryKeys = typeof queryKeys;
