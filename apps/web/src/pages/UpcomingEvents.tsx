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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  List,
  ChevronLeft,
  ChevronRight,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchUpcomingEvents,
  fetchPastEvents,
  type PlannedEvent,
} from "@/integrations/supabase/plannedEvents";
import { EventCard } from "@/components/events/EventCard";
import { useIsCompact } from "@/hooks/use-compact";
import Navbar from "@/components/layout/Navbar";

// ─── Mini calendar ────────────────────────────────────────────────────────
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
        <span className="text-sm font-medium">
          {format(month, "MMMM yyyy")}
        </span>
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

// ─── Event list ───────────────────────────────────────────────────────────
const EventList: React.FC<{
  events: PlannedEvent[];
  isLoading: boolean;
  onEventClick: (eventId: string) => void;
  onCreateEvent: () => void;
  emptyLabel?: string;
}> = ({
  events,
  isLoading,
  onEventClick,
  onCreateEvent,
  emptyLabel = "No upcoming events",
}) => {
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
          <p className="font-medium">{emptyLabel}</p>
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
          onClick={() => onEventClick(event.id)}
        />
      ))}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────
const UpcomingEvents: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isCompact = useIsCompact();

  const [tab, setTab] = React.useState<"upcoming" | "past">("upcoming");
  const [view, setView] = React.useState<"list" | "calendar">("list");
  const [calendarMonth, setCalendarMonth] = React.useState(new Date());
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["upcoming-events", user?.id],
    queryFn: () => fetchUpcomingEvents(user!.id),
    enabled: !!user?.id,
    retry: 1,
  });

  const { data: pastEvents = [], isLoading: pastLoading } = useQuery({
    queryKey: ["past-events", user?.id],
    queryFn: () => fetchPastEvents(user!.id),
    enabled: !!user?.id && tab === "past",
    retry: 1,
  });

  const activeEvents = tab === "upcoming" ? events : pastEvents;
  const activeLoading = tab === "upcoming" ? isLoading : pastLoading;

  const visibleEvents: PlannedEvent[] = React.useMemo(() => {
    if (view === "calendar" && selectedDay) {
      return activeEvents.filter(
        (e) => e.date === format(selectedDay, "yyyy-MM-dd")
      );
    }
    return activeEvents;
  }, [activeEvents, view, selectedDay]);

  const handleDaySelect = (day: Date) =>
    setSelectedDay((prev) => (prev && isSameDay(prev, day) ? null : day));

  const handleEventClick = (eventId: string) =>
    navigate(`/events/${eventId}`);

  // ── Tab toggle component ──────────────────────────────────────────────
  const TabToggle = () => (
    <div className="flex border rounded-lg overflow-hidden mb-3">
      <button
        type="button"
        onClick={() => setTab("upcoming")}
        className={cn(
          "flex-1 px-4 py-2 text-sm font-medium transition-colors",
          tab === "upcoming"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted"
        )}
      >
        Upcoming
      </button>
      <button
        type="button"
        onClick={() => setTab("past")}
        className={cn(
          "flex-1 px-4 py-2 text-sm font-medium transition-colors",
          tab === "past"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted"
        )}
      >
        Past events
      </button>
    </div>
  );

  // ── Filter + view controls ────────────────────────────────────────────
  const ControlsRow = () => (
    <div className="flex items-center justify-between mb-4">
      <button
        type="button"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Filter
      </button>
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
  );

  // ── Desktop layout ─────────────────────────────────────────────────────
  if (!isCompact) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold">Events</h1>
              <Button onClick={() => navigate("/events/new")} size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Create Event
              </Button>
            </div>

            <TabToggle />

            <div className="flex gap-8">
              <aside className="w-64 shrink-0">
                <div className="rounded-2xl border bg-card p-4 sticky top-20">
                  <MiniCalendar
                    events={activeEvents}
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
                <EventList
                  events={visibleEvents}
                  isLoading={activeLoading}
                  onEventClick={handleEventClick}
                  onCreateEvent={() => navigate("/events/new")}
                  emptyLabel={
                    tab === "past" ? "No past events" : "No upcoming events"
                  }
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Mobile / tablet ────────────────────────────────────────────────────
  return (
    <div className="px-4 py-4 pb-24">
      <h1 className="text-xl font-bold mb-3">Events</h1>

      <TabToggle />
      <ControlsRow />

      {view === "calendar" && (
        <div className="rounded-2xl border bg-card p-4 mb-4">
          <MiniCalendar
            events={activeEvents}
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

      <EventList
        events={visibleEvents}
        isLoading={activeLoading}
        onEventClick={handleEventClick}
        onCreateEvent={() => navigate("/events/new")}
        emptyLabel={
          tab === "past" ? "No past events" : "No upcoming events"
        }
      />
    </div>
  );
};

export default UpcomingEvents;
