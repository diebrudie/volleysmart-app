import * as React from "react";
import { format, parseISO, isPast } from "date-fns";
import {
  MapPin,
  Clock,
  Users,
  CalendarClock,
  Check,
  HelpCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PlannedEvent, RsvpStatus } from "@/integrations/supabase/plannedEvents";

// ─── Event type config ────────────────────────────────────────────────────────
const EVENT_TYPE_CONFIG = {
  friendly_game: {
    label: "Friendly",
    bg: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  },
  social_game: {
    label: "Social",
    bg: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  },
  training: {
    label: "Training",
    bg: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  },
  tournament: {
    label: "Tournament",
    bg: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  },
} as const;

// ─── RSVP button config ───────────────────────────────────────────────────────
const RSVP_OPTIONS: {
  status: RsvpStatus;
  label: string;
  icon: React.ReactNode;
  activeClass: string;
}[] = [
  {
    status: "attending",
    label: "Going",
    icon: <Check className="h-3.5 w-3.5" />,
    activeClass:
      "bg-green-600 text-white border-green-600 hover:bg-green-700 dark:bg-green-700 dark:border-green-700",
  },
  {
    status: "maybe",
    label: "Maybe",
    icon: <HelpCircle className="h-3.5 w-3.5" />,
    activeClass:
      "bg-yellow-500 text-white border-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:border-yellow-600",
  },
  {
    status: "declined",
    label: "Can't",
    icon: <X className="h-3.5 w-3.5" />,
    activeClass:
      "bg-red-500 text-white border-red-500 hover:bg-red-600 dark:bg-red-600 dark:border-red-600",
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────
interface EventCardProps {
  event: PlannedEvent;
  playerId: string | null;
  onRsvp: (eventId: string, status: RsvpStatus) => void;
  rsvpLoading?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  playerId,
  onRsvp,
  rsvpLoading = false,
}) => {
  const typeConfig = EVENT_TYPE_CONFIG[event.event_type];

  // Count attendees
  const attendingCount =
    event.event_rsvp?.filter((r) => r.status === "attending").length ?? 0;

  // Current user's RSVP
  const myRsvp = playerId
    ? event.event_rsvp?.find((r) => r.player_id === playerId)?.status ?? null
    : null;

  // RSVP deadline
  const deadlinePast = event.rsvp_deadline
    ? isPast(parseISO(event.rsvp_deadline))
    : false;

  const canRsvp = !!playerId && !deadlinePast && event.status !== "cancelled";

  // Format date and time
  const dateLabel = format(parseISO(event.date), "EEE, MMM d");
  const timeLabel = event.start_time.slice(0, 5); // HH:MM

  const deadlineLabel = event.rsvp_deadline
    ? format(parseISO(event.rsvp_deadline), "MMM d, HH:mm")
    : null;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 flex flex-col gap-3 shadow-sm",
        event.status === "cancelled" && "opacity-60"
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge className={cn("text-xs font-medium px-2 py-0.5 border-0", typeConfig.bg)}>
            {typeConfig.label}
          </Badge>
          {event.status === "confirmed" && (
            <Badge className="text-xs px-2 py-0.5 border-0 bg-primary/10 text-primary">
              Confirmed
            </Badge>
          )}
          {event.status === "cancelled" && (
            <Badge variant="destructive" className="text-xs px-2 py-0.5">
              Cancelled
            </Badge>
          )}
        </div>
        {event.clubs?.name && (
          <span className="text-xs text-muted-foreground shrink-0">
            {event.clubs.name}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-base leading-tight">{event.title}</h3>

      {/* Meta info */}
      <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>
            {dateLabel} · {timeLabel}
          </span>
        </div>
        {event.locations?.name && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>
              {event.locations.name}
              {event.locations.city ? `, ${event.locations.city}` : ""}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span>
            {attendingCount}
            {event.max_players ? ` / ${event.max_players}` : ""} attending
          </span>
        </div>
        {deadlineLabel && (
          <div className="flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
            <span className={deadlinePast ? "text-destructive" : ""}>
              RSVP{deadlinePast ? " closed" : " by"} {deadlineLabel}
            </span>
          </div>
        )}
      </div>

      {/* RSVP buttons */}
      {canRsvp && (
        <div className="flex gap-2 pt-1">
          {RSVP_OPTIONS.map((opt) => {
            const isActive = myRsvp === opt.status;
            return (
              <button
                key={opt.status}
                type="button"
                disabled={rsvpLoading}
                onClick={() => onRsvp(event.id, opt.status)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  isActive
                    ? opt.activeClass
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {opt.icon}
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Deadline passed — show current status read-only */}
      {!canRsvp && playerId && event.status !== "cancelled" && myRsvp && (
        <p className="text-xs text-muted-foreground">
          Your RSVP:{" "}
          <span className="font-medium capitalize">{myRsvp}</span>
        </p>
      )}
    </div>
  );
};
