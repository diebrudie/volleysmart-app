/**
 * Per-type notification display config.
 *
 * Ported from apps/web/src/pages/Notifications.tsx (getNotificationConfig).
 * Web hrefs are translated to mobile expo-router routes:
 *   /manage-requests      -> /clubs/{club_id}/manage-members (nearest parent; needs club_id in payload)
 *   /game/{match_day_id}  -> /events/{event_id} (no game screen on mobile yet)
 *   /new-club             -> /clubs/create
 *   /events/new           -> /events/create
 *   /discover-events      -> /events/discover
 *   /home                 -> /(tabs)
 */

import { format, parseISO } from "date-fns";
import type { Locale } from "date-fns";
import type { Notification, NotificationType } from "@volleysmart/core";
import { icons, type IoniconsName } from "@/constants/icons";
import type { ThemeColors } from "@/constants/colors";

/** Semantic theme color key used to tint the notification icon. */
export type NotificationColorKey = Extract<
  keyof ThemeColors,
  | "primary"
  | "accent"
  | "success"
  | "danger"
  | "warning"
  | "mutedForeground"
>;

export interface NotificationDisplay {
  icon: IoniconsName;
  colorKey: NotificationColorKey;
  title: string;
  description: string;
  /** Mobile route to navigate to on tap, or null when there is no target. */
  href: string | null;
}

type TFn = (
  key: string,
  options?: Record<string, unknown> & { defaultValue?: string }
) => string;

type Payload = Record<string, any>;

/**
 * Resolve icon, tint, translated title/description and mobile href for a
 * notification. `dateLocale` is the date-fns locale for the active language
 * (core getDateLocale(i18n.language)).
 */
export function getNotificationDisplay(
  n: Notification,
  t: TFn,
  dateLocale: Locale
): NotificationDisplay {
  const p: Payload = n.payload ?? {};

  switch (n.type as NotificationType) {
    case "club_join_request":
      return {
        icon: icons.userPlus,
        colorKey: "accent",
        title: t("type.joinRequest.title", { defaultValue: "Join Request" }),
        description: t("type.joinRequest.description", {
          defaultValue: "{{name}} wants to join {{club}}",
          name: p.requester_name ?? "Someone",
          club: p.club_name ?? "your club",
        }),
        // Web routes to the global /manage-requests page; mobile routes to the
        // club's manage-members screen when the payload carries a club_id.
        href: p.club_id ? `/clubs/${p.club_id}/manage-members` : null,
      };
    case "club_join_accepted":
      return {
        icon: icons.checkCircleOutline,
        colorKey: "success",
        title: t("type.joinAccepted.title", { defaultValue: "Request Accepted" }),
        description: t("type.joinAccepted.description", {
          defaultValue: "You've been accepted into {{club}}",
          club: p.club_name ?? "a club",
        }),
        href: p.club_id ? `/clubs/${p.club_id}` : null,
      };
    case "club_join_rejected":
      return {
        icon: icons.xCircle,
        colorKey: "danger",
        title: t("type.joinRejected.title", { defaultValue: "Request Declined" }),
        description: t("type.joinRejected.description", {
          defaultValue: "Your request to join {{club}} was declined",
          club: p.club_name ?? "a club",
        }),
        href: null,
      };
    case "club_member_joined":
      return {
        icon: icons.users,
        colorKey: "accent",
        title: t("type.memberJoined.title", { defaultValue: "New Member" }),
        description: t("type.memberJoined.description", {
          defaultValue: "{{name}} joined {{club}}",
          name: p.member_name ?? "A member",
          club: p.club_name ?? "your club",
        }),
        href: p.club_id ? `/clubs/${p.club_id}` : null,
      };
    case "event_created":
      return {
        icon: icons.calendarDays,
        colorKey: "primary",
        title: t("type.eventCreated.title", { defaultValue: "New Event" }),
        description: t("type.eventCreated.description", {
          defaultValue: "{{event}} — RSVP now!",
          event: p.event_title ?? "An event",
        }),
        href: p.event_id ? `/events/${p.event_id}` : null,
      };
    case "event_cancelled":
      return {
        icon: icons.calendarX,
        colorKey: "danger",
        title: t("type.eventCancelled.title", { defaultValue: "Event Cancelled" }),
        description: p.event_date
          ? t("type.eventCancelledDate.description", {
              defaultValue: "{{event}} on {{date}} has been cancelled",
              event: p.event_title ?? "An event",
              date: format(parseISO(p.event_date), "MMM d", {
                locale: dateLocale,
              }),
            })
          : t("type.eventCancelled.description", {
              defaultValue: "{{event}} has been cancelled",
              event: p.event_title ?? "An event",
            }),
        href: p.event_id ? `/events/${p.event_id}` : null,
      };
    case "event_rsvp":
      return {
        icon: icons.messageSquare,
        colorKey: "primary",
        title: t("type.rsvp.title", { defaultValue: "RSVP Update" }),
        description: t("type.rsvp.description", {
          defaultValue: "{{name}} is {{status}} {{event}}",
          name: p.player_name ?? "Someone",
          status: p.rsvp_status ?? "attending",
          event: p.event_title ?? "an event",
        }),
        href: p.event_id ? `/events/${p.event_id}` : null,
      };
    case "rsvp_deadline_reminder":
      return {
        icon: icons.bell,
        colorKey: "warning",
        title: t("type.rsvpReminder.title", { defaultValue: "RSVP Reminder" }),
        description: t("type.rsvpReminder.description", {
          defaultValue: "Last day to RSVP for {{event}}",
          event: p.event_title ?? "an event",
        }),
        href: p.event_id ? `/events/${p.event_id}` : null,
      };
    case "game_started":
      return {
        // Web uses lucide Volleyball; registry has no ball glyph -> trophy.
        icon: icons.trophy,
        colorKey: "success",
        title: t("type.gameStarted.title", { defaultValue: "Game Started" }),
        description: t("type.gameStarted.description", {
          defaultValue: "{{event}} has started",
          event: p.event_title ?? "A game",
        }),
        // Web routes to /game/{match_day_id}; mobile has no game screen yet,
        // so we route to the parent event when available.
        href: p.event_id ? `/events/${p.event_id}` : null,
      };
    case "club_member_left":
      return {
        icon: icons.logOut,
        colorKey: "danger",
        title: t("type.memberLeft.title", { defaultValue: "Member Left" }),
        description: t("type.memberLeft.description", {
          defaultValue: "{{name}} left {{club}}",
          name: p.member_name ?? "A member",
          club: p.club_name ?? "your club",
        }),
        href: p.club_id ? `/clubs/${p.club_id}` : null,
      };
    case "club_member_removed":
      return {
        icon: icons.userMinus,
        colorKey: "danger",
        title: t("type.memberRemoved.title", {
          defaultValue: "Removed from Club",
        }),
        description: t("type.memberRemoved.description", {
          defaultValue: "You've been removed from {{club}}",
          club: p.club_name ?? "a club",
        }),
        href: null,
      };
    case "engagement_welcome":
      return {
        icon: icons.sparkles,
        colorKey: "primary",
        title: t("type.engagementWelcome.title", {
          defaultValue: "Welcome to VolleySmart!",
        }),
        description: t("type.engagementWelcome.description", {
          defaultValue: "You're all set! Explore clubs and events near you.",
        }),
        href: null,
      };
    case "engagement_create_club":
      return {
        icon: icons.users,
        colorKey: "accent",
        title: t("type.engagementCreateClub.title", {
          defaultValue: "Create Your First Club",
        }),
        description: t("type.engagementCreateClub.description", {
          defaultValue: "Start a club and invite your volleyball crew.",
        }),
        href: "/clubs/create",
      };
    case "engagement_create_event":
      return {
        icon: icons.plusCircle,
        colorKey: "primary",
        title: t("type.engagementCreateEvent.title", {
          defaultValue: "Plan Your First Event",
        }),
        description: t("type.engagementCreateEvent.description", {
          defaultValue: "Create a game or practice for your club members.",
        }),
        href: "/events/create",
      };
    case "engagement_public_event":
      return {
        icon: icons.globe,
        colorKey: "success",
        title: t("type.engagementPublicEvent.title", {
          defaultValue: "Public Event Nearby",
        }),
        description: t("type.engagementPublicEvent.description", {
          defaultValue: "{{event}} is open — RSVP now!",
          event: p.event_title ?? "An event",
        }),
        href: p.event_id ? `/events/${p.event_id}` : "/events/discover",
      };
    case "engagement_come_back":
      return {
        icon: icons.heart,
        colorKey: "warning",
        title: t("type.engagementComeBack.title", {
          defaultValue: "We Miss You!",
        }),
        description: t("type.engagementComeBack.description", {
          defaultValue: "Come back and see what's happening in your clubs.",
        }),
        href: "/(tabs)",
      };
    default:
      return {
        icon: icons.bell,
        colorKey: "mutedForeground",
        title: t("type.default.title", { defaultValue: "Notification" }),
        description: "",
        href: null,
      };
  }
}
