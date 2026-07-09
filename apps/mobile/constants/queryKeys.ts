/**
 * Central react-query key registry.
 *
 * IMPORTANT: The literal key strings are kept byte-identical to the strings
 * hooks used at runtime before migrating to this registry, so caches and
 * invalidation keep working (e.g. ["pending-requests-count", clubId]).
 *
 * Prefix invalidation: pass the namespace root, e.g.
 *   queryClient.invalidateQueries({ queryKey: queryKeys.events.allUpcoming })
 * matches every ["upcoming-events", ...] key.
 */

export const queryKeys = {
  events: {
    /** useUpcomingEvents -> ["upcoming-events", userId] */
    upcoming: (userId: string | undefined) =>
      ["upcoming-events", userId] as const,
    /** Prefix for invalidating all upcoming-events queries (used by useRsvpMutation). */
    allUpcoming: ["upcoming-events"] as const,
    /** useEventDetail -> ["event-detail", eventId] */
    detail: (eventId: string | undefined) => ["event-detail", eventId] as const,
    allDetails: ["event-detail"] as const,
    past: (userId: string | undefined) => ["past-events", userId] as const,
    /** Prefix for invalidating all past-events queries. */
    allPast: ["past-events"] as const,
    discover: (city?: string) => ["discover-events", city] as const,
    /** Prefix for invalidating all discover-events queries. */
    allDiscover: ["discover-events"] as const,
    attendees: (eventId: string | undefined) =>
      ["event-attendees", eventId] as const,
    templates: (clubId: string | undefined) =>
      ["event-templates", clubId] as const,
    /** Saved event locations, keyed by club scope + user (EventFormFields). */
    locations: (clubId: string | null, userId: string | undefined) =>
      ["event-locations", clubId ?? "none", userId] as const,
    /** Previously used opponent team names per club (EventFormFields). */
    opponentNames: (clubId: string | null | undefined) =>
      ["opponent-team-names", clubId] as const,
    /** Linked match day for a planned event (mirrors web ["event-match-day", id]). */
    matchDay: (eventId: string | undefined) =>
      ["event-match-day", eventId] as const,
  },

  clubs: {
    /** useUserClubs -> ["user-clubs", userId] */
    mine: (userId: string | undefined) => ["user-clubs", userId] as const,
    /** Prefix for invalidating all user-clubs queries. */
    allMine: ["user-clubs"] as const,
    detail: (clubId: string | undefined) => ["club-detail", clubId] as const,
    /** useClubEvents -> ["club-events", clubId] */
    events: (clubId: string | undefined) => ["club-events", clubId] as const,
    /** Prefix for invalidating all club-events queries (used by useRsvpMutation). */
    allEvents: ["club-events"] as const,
    /** useClubMembers -> ["club-members", clubId] */
    members: (clubId: string | undefined) => ["club-members", clubId] as const,
    stats: (clubId: string | undefined) => ["club-stats", clubId] as const,
    guests: (clubId: string | undefined) => ["club-guests", clubId] as const,
    /** useIsAdmin -> ["isAdmin", clubId, userId] */
    isAdmin: (clubId: string | undefined, userId: string | undefined) =>
      ["isAdmin", clubId, userId] as const,
    role: (clubId: string | undefined, userId: string | undefined) =>
      ["club-role", clubId, userId] as const,
    memberCount: (clubId: string | undefined) =>
      ["club-member-count", clubId] as const,
    discover: (query?: string) => ["discover-clubs", query] as const,
    /** Prefix for invalidating all discover-clubs queries. */
    allDiscover: ["discover-clubs"] as const,
    /** Upcoming public events for a club detail page. */
    publicEvents: (clubId: string | undefined) =>
      ["club-public-events", clubId] as const,
    /** Saved club locations (mirrors web ["club-locations", clubId]). */
    locations: (clubId: string | undefined) =>
      ["club-locations", clubId] as const,
    /** Per-club pending join-request count (mirrors web ["pendingRequestsCount", clubId]). */
    pendingRequestsCount: (clubId: string | undefined) =>
      ["pending-requests-count", clubId] as const,
    /** The signed-in user's own pending club join requests (Discover clubs). */
    pendingJoinRequests: (userId: string | undefined) =>
      ["pending-club-requests", userId] as const,
    /** IDs of the clubs the user belongs to (discover-events exclusion list). */
    userClubIds: (userId: string | undefined) =>
      ["user-club-ids", userId] as const,
  },

  members: {
    global: (userId: string | undefined) => ["members-global", userId] as const,
    /** Prefix for invalidating all members-global queries. */
    allGlobal: ["members-global"] as const,
    manage: (clubId: string | undefined) =>
      ["members-manage", clubId] as const,
    invites: (clubId: string | undefined) =>
      ["club-invites", clubId] as const,
    /** Invite-token validation, mirrors web ["validate-invitation", token]. */
    inviteValidation: (token: string | undefined) =>
      ["invite-validation", token] as const,
    /** Prefix for invalidating every per-club pending join-request count. */
    pendingCountPrefix: ["pending-requests-count"] as const,
  },

  notifications: {
    /** useUnreadNotifications -> ["unreadNotificationCount", userId] */
    unreadCount: (userId: string | undefined) =>
      ["unreadNotificationCount", userId] as const,
    /** Prefix for invalidating all unread-count queries. */
    allUnread: ["unreadNotificationCount"] as const,
    list: (userId: string | undefined) => ["notifications", userId] as const,
    /** Prefix for invalidating all notification lists. */
    all: ["notifications"] as const,
    preferences: (userId: string | undefined) =>
      ["notification-preferences", userId] as const,
  },

  profile: {
    /** usePlayerProfile -> ["player-profile", userId] */
    player: (userId: string | undefined) =>
      ["player-profile", userId] as const,
    /** Prefix for invalidating all player-profile queries. */
    allPlayer: ["player-profile"] as const,
    /** useCurrentPlayerId -> ["current-player-id", userId] */
    currentPlayerId: (userId: string | undefined) =>
      ["current-player-id", userId] as const,
    stats: (playerId: string | undefined, clubId?: string) =>
      ["player-stats", playerId, clubId] as const,
    /** Prefix for invalidating all player-stats queries. */
    allStats: ["player-stats"] as const,
    /** Clubs list on the profile "My Clubs" tab. */
    clubs: (userId: string | undefined) => ["profile-clubs", userId] as const,
    /** Public profile of an event's creator (HostedBy). */
    creator: (userId: string | undefined) =>
      ["creator-profile", userId] as const,
  },

  positions: {
    /** Player positions master data (onboarding + profile edit). */
    all: ["positions"] as const,
  },

  home: {
    dashboard: (userId: string | undefined) =>
      ["home-dashboard", userId] as const,
    /** Today/next event card -> ["home-todays-event", userId, playerId, todayStr] */
    todaysEvent: (
      userId: string | undefined,
      playerId: string | null | undefined,
      todayStr: string,
    ) => ["home-todays-event", userId, playerId, todayStr] as const,
    allTodaysEvent: ["home-todays-event"] as const,
    lastGame: (playerId: string | null | undefined) =>
      ["home-last-game", playerId] as const,
    allLastGame: ["home-last-game"] as const,
    monthlyStats: (
      userId: string | undefined,
      playerId: string | null | undefined,
      clubIds: string[],
    ) => ["home-monthly-stats", userId, playerId, clubIds] as const,
    allMonthlyStats: ["home-monthly-stats"] as const,
  },
} as const;

export type QueryKeys = typeof queryKeys;
