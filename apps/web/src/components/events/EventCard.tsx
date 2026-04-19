import * as React from "react";
import { format, parseISO } from "date-fns";
import { Clock, Users, CalendarClock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlannedEvent } from "@/integrations/supabase/plannedEvents";

interface EventCardProps {
  event: PlannedEvent;
  onClick?: () => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onClick }) => {
  const parsedDate = parseISO(event.date);
  const dateLabel = format(parsedDate, "EEE, MMM d");
  const timeLabel = event.start_time.slice(0, 5);
  const attendingCount =
    event.event_rsvp?.filter((r) => r.status === "attending").length ?? 0;

  const deadlineLabel = event.rsvp_deadline
    ? `RSVP by ${format(parseISO(event.rsvp_deadline), "MMM d")}`
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-2xl border bg-card shadow-sm",
        "cursor-pointer hover:bg-muted/50 transition-colors text-left",
        event.status === "cancelled" && "opacity-60"
      )}
    >
      {/* Calendar badge */}
      <div className="w-14 rounded-lg overflow-hidden shadow-sm border border-border shrink-0">
        <div className="bg-[#EB534C] text-white text-center py-0.5">
          <span className="text-[10px] font-semibold uppercase">
            {format(parsedDate, "MMM")}
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
        <h3 className="font-semibold text-sm leading-tight truncate">
          {event.title}
        </h3>
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
          {deadlineLabel && (
            <div className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 shrink-0" />
              <span>{deadlineLabel}</span>
            </div>
          )}
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
    </button>
  );
};
