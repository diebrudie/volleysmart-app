import * as React from "react";
import { format, parseISO, isToday } from "date-fns";
import { Clock, Users, CalendarClock, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlannedEvent } from "@/integrations/supabase/plannedEvents";

interface EventCardProps {
  event: PlannedEvent;
  onClick?: () => void;
  currentPlayerId?: string | null;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onClick, currentPlayerId }) => {
  const parsedDate = parseISO(event.date);
  const isTodayEvent = isToday(parsedDate);
  const dateLabel = format(parsedDate, "EEE, MMM d");
  const timeLabel = event.start_time.slice(0, 5);
  const attendingCount =
    event.event_rsvp?.filter((r) => r.status === "attending").length ?? 0;

  // Current user's RSVP status
  const myRsvp = currentPlayerId
    ? event.event_rsvp?.find((r) => r.player_id === currentPlayerId)
    : undefined;

  const deadlineIsToday = event.rsvp_deadline
    ? isToday(parseISO(event.rsvp_deadline))
    : false;

  const deadlineLabel = event.rsvp_deadline
    ? `RSVP by ${deadlineIsToday ? "today" : format(parseISO(event.rsvp_deadline), "MMM d")}`
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-2xl border bg-card shadow-sm",
        "cursor-pointer hover:bg-muted/50 transition-colors text-left",
        event.status === "cancelled" && "opacity-60",
        isTodayEvent &&
          "border-primary/60 bg-primary/5 dark:bg-primary/10 ring-1 ring-primary/30"
      )}
    >
      {/* Calendar badge */}
      <div
        className={cn(
          "w-14 rounded-lg overflow-hidden shadow-sm border shrink-0",
          isTodayEvent ? "border-primary" : "border-border"
        )}
      >
        <div
          className={cn(
            "text-white text-center py-0.5",
            isTodayEvent ? "bg-primary" : "bg-[#EB534C]"
          )}
        >
          <span className="text-[10px] font-semibold uppercase">
            {isTodayEvent ? "Today" : format(parsedDate, "MMM")}
          </span>
        </div>
        <div className="bg-white dark:bg-card text-foreground text-center py-1">
          <span className="text-xl font-bold leading-none block">
            {format(parsedDate, "d")}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {format(parsedDate, "EEE")}
          </span>
        </div>
      </div>

      {/* Event info */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm leading-tight truncate">
            {event.title}
          </h3>
          {event.status === "cancelled" ? (
            <span className="shrink-0 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
              Cancelled
            </span>
          ) : isTodayEvent ? (
            <span className="shrink-0 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
              Today
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>
              {dateLabel} · {timeLabel}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>{attendingCount} attending</span>
          </div>
          {myRsvp?.status === "attending" ? (
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">You're going</span>
            </div>
          ) : myRsvp?.status === "declined" ? (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <XCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">You declined</span>
            </div>
          ) : deadlineLabel ? (
            <div className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 shrink-0" />
              <span>{deadlineLabel}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
    </button>
  );
};
