import * as React from "react";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  List,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchUpcomingEvents,
  upsertRsvp,
  type PlannedEvent,
  type RsvpStatus,
} from "@/integrations/supabase/plannedEvents";
import { EventCard } from "@/components/events/EventCard";
import { useIsCompact } from "@/hooks/use-compact";
import Navbar from "@/components/layout/Navbar";

// ─── User profile chip ────────────────────────────────────────────────────────
const UserChip: React.FC<{ userId: string }> = ({ userId }) => {
  const [profile, setProfile] = React.useState<{
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string | null;
    skill_rating?: number | null;
  } | null>(null);

  React.useEffect(() => {
    let active = true;
    supabase
      .from("players")
      .select("first_name, last_name, image_url, skill_rating")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) setProfile(data);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  if (!profile) return null;

  const initials = [profile.first_name?.[0], profile.last_name?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
        {profile.image_url ? (
          <img
            src={profile.image_url}
            alt="Avatar"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-sm font-semibold">{initials || "?"}</span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium leading-none">
          {[profile.first_name, profile.last_name].filter(Boolean).join(" ")}
        </p>
        {profile.skill_rating != null && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Level {profile.skill_rating}
          </p>
        )}
      </div>
    </div>
  );
};

// ─── Mini calendar ────────────────────────────────────────────────────────────
interface MiniCalendarProps {
  events: PlannedEvent[];
  month: Date;
  onMonthChange: (d: Date) => void;
  selectedDay: Date | null;
  onDaySelect: (d: Date) => void;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({
  events,
  month,
  onMonthChange,
  selectedDay,
  onDaySelect,
}) => {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const eventDates = new Set(events.map((e) => e.date));

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => onMonthChange(subMonths(month, 1))}
          className="p-1 rounded hover:bg-muted"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">{format(month, "MMMM yyyy")}</span>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, 1))}
          className="p-1 rounded hover:bg-muted"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div
            key={i}
            className="text-center text-[10px] font-medium text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const hasEvent = eventDates.has(dateStr);
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
          const isCurrentMonth = day.getMonth() === month.getMonth();
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onDaySelect(day)}
              className={cn(
                "relative flex flex-col items-center justify-center h-9 w-full rounded-lg text-xs transition-colors",
                !isCurrentMonth && "opacity-30",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isToday
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              )}
            >
              {day.getDate()}
              {hasEvent && (
                <span
                  className={cn(
                    "absolute bottom-1 h-1 w-1 rounded-full",
                    isSelected ? "bg-primary-foreground" : "bg-primary"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Event list ───────────────────────────────────────────────────────────────
const EventList: React.FC<{
  events: PlannedEvent[];
  isLoading: boolean;
  playerId: string | null;
  onRsvp: (eventId: string, status: RsvpStatus) => void;
  rsvpLoading: boolean;
  onCreateEvent: () => void;
}> = ({ events, isLoading, playerId, onRsvp, rsvpLoading, onCreateEvent }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-6 w-6 rounded-full border-2 border-muted border-t-foreground" />
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <CalendarDays className="h-12 w-12 text-muted-foreground" />
        <div>
          <p className="font-medium">No upcoming events</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create one to get started
          </p>
        </div>
        <Button size="sm" onClick={onCreateEvent}>
          <Plus className="h-4 w-4 mr-1.5" />
          Create Event
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          playerId={playerId}
          onRsvp={onRsvp}
          rsvpLoading={rsvpLoading}
        />
      ))}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const UpcomingEvents: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isCompact = useIsCompact();

  const [view, setView] = React.useState<"list" | "calendar">("list");
  const [calendarMonth, setCalendarMonth] = React.useState(new Date());
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);

  const { data: playerId } = useQuery({
    queryKey: ["my-player-id", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("players")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      return data?.id ?? null;
    },
    enabled: !!user?.id,
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["upcoming-events", user?.id],
    queryFn: () => fetchUpcomingEvents(user!.id),
    enabled: !!user?.id,
  });

  const rsvpMutation = useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: RsvpStatus }) =>
      upsertRsvp(eventId, playerId!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
    },
  });

  const visibleEvents: PlannedEvent[] =
    view === "calendar" && selectedDay
      ? events.filter((e) => e.date === format(selectedDay, "yyyy-MM-dd"))
      : events;

  const handleRsvp = (eventId: string, status: RsvpStatus) => {
    if (!playerId) return;
    rsvpMutation.mutate({ eventId, status });
  };

  const handleDaySelect = (day: Date) =>
    setSelectedDay((prev) => (prev && isSameDay(prev, day) ? null : day));

  // ── Desktop: sidebar calendar + wide event grid ────────────────────────────
  if (!isCompact) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-6">
              {user?.id && <UserChip userId={user.id} />}
              <Button onClick={() => navigate("/events/new")} size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Create Event
              </Button>
            </div>

            <div className="flex gap-8">
              <aside className="w-64 shrink-0">
                <div className="rounded-2xl border bg-card p-4 sticky top-20">
                  <MiniCalendar
                    events={events}
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    selectedDay={selectedDay}
                    onDaySelect={handleDaySelect}
                  />
                  {selectedDay && (
                    <button
                      type="button"
                      onClick={() => setSelectedDay(null)}
                      className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear filter
                    </button>
                  )}
                </div>
              </aside>

              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-semibold mb-4">
                  {selectedDay
                    ? `Events on ${format(selectedDay, "MMMM d")}`
                    : "Upcoming Events"}
                </h1>
                <EventList
                  events={visibleEvents}
                  isLoading={isLoading}
                  playerId={playerId ?? null}
                  onRsvp={handleRsvp}
                  rsvpLoading={rsvpMutation.isPending}
                  onCreateEvent={() => navigate("/events/new")}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Mobile / tablet ────────────────────────────────────────────────────────
  return (
    <div className="px-4 py-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        {user?.id && <UserChip userId={user.id} />}
        <div className="flex items-center border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
              view === "list"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
          <button
            type="button"
            onClick={() => setView("calendar")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
              view === "calendar"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Calendar
          </button>
        </div>
      </div>

      {view === "calendar" && (
        <div className="rounded-2xl border bg-card p-4 mb-4">
          <MiniCalendar
            events={events}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            selectedDay={selectedDay}
            onDaySelect={handleDaySelect}
          />
          {selectedDay && (
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="mt-2 w-full text-xs text-muted-foreground"
            >
              Show all events
            </button>
          )}
        </div>
      )}

      <h1 className="text-lg font-semibold mb-3">
        {view === "calendar" && selectedDay
          ? `Events on ${format(selectedDay, "MMMM d")}`
          : "Upcoming Events"}
      </h1>

      <EventList
        events={visibleEvents}
        isLoading={isLoading}
        playerId={playerId ?? null}
        onRsvp={handleRsvp}
        rsvpLoading={rsvpMutation.isPending}
        onCreateEvent={() => navigate("/events/new")}
      />
    </div>
  );
};

export default UpcomingEvents;
