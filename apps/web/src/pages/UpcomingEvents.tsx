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
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  List,
  ChevronLeft,
  ChevronRight,
  Plus,
  SlidersHorizontal,
  ArrowUpDown,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  fetchUpcomingEvents,
  fetchPastEvents,
  type PlannedEvent,
  type PastEventRow,
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

// ─── Upcoming event list ──────────────────────────────────────────────────
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

// ─── Past events table ────────────────────────────────────────────────────
const PastEventsList: React.FC<{
  events: PastEventRow[];
  isLoading: boolean;
  onEventClick: (eventId: string) => void;
}> = ({ events, isLoading, onEventClick }) => {
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
        <p className="font-medium">No past events</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
        <span>Event</span>
        <span className="w-16 text-center">Club</span>
        <span className="w-14 text-center">Score</span>
        <span className="w-8" />
      </div>
      {/* Rows */}
      {events.map((e, idx) => (
        <div
          key={e.id}
          className={cn(
            "grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center px-3 py-2.5",
            idx < events.length - 1 && "border-b"
          )}
        >
          {/* Event name + date */}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{e.title}</p>
            <p className="text-xs text-muted-foreground">
              {format(parseISO(e.date), "MMM d, yyyy")}
            </p>
          </div>

          {/* Club */}
          <span className="w-16 text-xs text-muted-foreground text-center truncate">
            {e.club_name ?? "—"}
          </span>

          {/* Score */}
          <span className="w-14 text-center">
            {e.has_score ? (
              <span className="text-sm font-semibold">
                {e.team_a_wins}–{e.team_b_wins}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </span>

          {/* View */}
          <button
            type="button"
            onClick={() => onEventClick(e.id)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            aria-label="View details"
          >
            <Eye className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      ))}
    </div>
  );
};

// ─── Filter types ─────────────────────────────────────────────────────────
type RsvpFilterValue = "all" | "attending" | "maybe" | "declined" | "none";
type EventTypeFilterValue =
  | "all"
  | "friendly_game"
  | "social_game"
  | "training"
  | "tournament";

const RSVP_FILTER_OPTIONS: { value: RsvpFilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "attending", label: "Going" },
  { value: "maybe", label: "Maybe" },
  { value: "declined", label: "Not going" },
  { value: "none", label: "Not responded" },
];

const EVENT_TYPE_FILTER_OPTIONS: {
  value: EventTypeFilterValue;
  label: string;
}[] = [
  { value: "all", label: "All types" },
  { value: "friendly_game", label: "Friendly Game" },
  { value: "social_game", label: "Social Game" },
  { value: "training", label: "Training" },
  { value: "tournament", label: "Tournament" },
];

// ─── Main page ────────────────────────────────────────────────────────────
const UpcomingEvents: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCompact = useIsCompact();

  const [tab, setTab] = React.useState<"upcoming" | "past">("upcoming");
  const [view, setView] = React.useState<"list" | "calendar">("list");
  const [calendarMonth, setCalendarMonth] = React.useState(new Date());
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);
  const [sortAsc, setSortAsc] = React.useState(true);
  const [filterOpen, setFilterOpen] = React.useState(false);

  // Filter state
  const [rsvpFilter, setRsvpFilter] = React.useState<RsvpFilterValue>("all");
  const [eventTypeFilter, setEventTypeFilter] =
    React.useState<EventTypeFilterValue>("all");
  const [clubFilter, setClubFilter] = React.useState<string>("all");

  // Data queries
  const { data: playerId } = useQuery({
    queryKey: ["my-player-id", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await (await import("@/integrations/supabase/client"))
        .supabase.from("players")
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
    retry: 1,
  });

  const { data: pastEvents = [], isLoading: pastLoading } = useQuery({
    queryKey: ["past-events", user?.id],
    queryFn: () => fetchPastEvents(user!.id),
    enabled: !!user?.id && tab === "past",
    retry: 1,
  });

  // Extract unique club names for filter
  const clubNames = React.useMemo(() => {
    const names = new Set<string>();
    events.forEach((e) => {
      if (e.clubs?.name) names.add(e.clubs.name);
    });
    return Array.from(names).sort();
  }, [events]);

  // Filter + sort upcoming events
  const visibleEvents: PlannedEvent[] = React.useMemo(() => {
    let list = events;

    // Calendar day filter
    if (view === "calendar" && selectedDay) {
      list = list.filter(
        (e) => e.date === format(selectedDay, "yyyy-MM-dd")
      );
    }

    // RSVP filter
    if (rsvpFilter !== "all" && playerId) {
      list = list.filter((e) => {
        const myStatus =
          e.event_rsvp?.find((r) => r.player_id === playerId)?.status ?? null;
        if (rsvpFilter === "none") return myStatus === null;
        return myStatus === rsvpFilter;
      });
    }

    // Event type filter
    if (eventTypeFilter !== "all") {
      list = list.filter((e) => e.event_type === eventTypeFilter);
    }

    // Club filter
    if (clubFilter !== "all") {
      list = list.filter((e) => e.clubs?.name === clubFilter);
    }

    // Sort
    const sorted = [...list];
    sorted.sort((a, b) => {
      const cmp =
        a.date.localeCompare(b.date) ||
        a.start_time.localeCompare(b.start_time);
      return sortAsc ? cmp : -cmp;
    });

    return sorted;
  }, [
    events,
    view,
    selectedDay,
    rsvpFilter,
    eventTypeFilter,
    clubFilter,
    playerId,
    sortAsc,
  ]);

  // Sort past events
  const sortedPastEvents: PastEventRow[] = React.useMemo(() => {
    const sorted = [...pastEvents];
    sorted.sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [pastEvents, sortAsc]);

  const handleDaySelect = (day: Date) =>
    setSelectedDay((prev) => (prev && isSameDay(prev, day) ? null : day));

  const handleEventClick = (eventId: string) =>
    navigate(`/events/${eventId}`);

  const activeFilterCount =
    (rsvpFilter !== "all" ? 1 : 0) +
    (eventTypeFilter !== "all" ? 1 : 0) +
    (clubFilter !== "all" ? 1 : 0);

  // ── Tab toggle ──────────────────────────────────────────────────────────
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

  // ── Controls row ────────────────────────────────────────────────────────
  const ControlsRow = () => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {/* Sort button */}
        <button
          type="button"
          onClick={() => setSortAsc((prev) => !prev)}
          className={cn(
            "flex items-center justify-center h-8 w-8 border rounded-lg transition-colors",
            "text-muted-foreground hover:bg-muted"
          )}
          aria-label={sortAsc ? "Sort descending" : "Sort ascending"}
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
        </button>

        {/* Filter button */}
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filter
          {activeFilterCount > 0 && (
            <span className="ml-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* List/Calendar toggle — disabled on past tab */}
      <div
        className={cn(
          "flex items-center border rounded-lg overflow-hidden",
          tab === "past" && "opacity-40 pointer-events-none"
        )}
      >
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

  // ── Filter drawer ───────────────────────────────────────────────────────
  const FilterDrawer = () => (
    <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-3 border-b">
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* RSVP filter */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              RSVP Status
            </p>
            <div className="flex flex-col gap-1">
              {RSVP_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRsvpFilter(opt.value)}
                  className={cn(
                    "text-left px-3 py-2 rounded-lg text-sm transition-colors",
                    rsvpFilter === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Event type filter */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Event Type
            </p>
            <div className="flex flex-col gap-1">
              {EVENT_TYPE_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEventTypeFilter(opt.value)}
                  className={cn(
                    "text-left px-3 py-2 rounded-lg text-sm transition-colors",
                    eventTypeFilter === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Club filter */}
          {clubNames.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Club
              </p>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setClubFilter("all")}
                  className={cn(
                    "text-left px-3 py-2 rounded-lg text-sm transition-colors",
                    clubFilter === "all"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  All clubs
                </button>
                {clubNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setClubFilter(name)}
                    className={cn(
                      "text-left px-3 py-2 rounded-lg text-sm transition-colors",
                      clubFilter === name
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Clear filters */}
        {activeFilterCount > 0 && (
          <div className="px-4 py-3 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setRsvpFilter("all");
                setEventTypeFilter("all");
                setClubFilter("all");
              }}
            >
              Clear all filters
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
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
              {tab === "upcoming" && (
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
              )}

              <div className="flex-1 min-w-0">
                {tab === "upcoming" ? (
                  <EventList
                    events={visibleEvents}
                    isLoading={isLoading}
                    onEventClick={handleEventClick}
                    onCreateEvent={() => navigate("/events/new")}
                  />
                ) : (
                  <PastEventsList
                    events={sortedPastEvents}
                    isLoading={pastLoading}
                    onEventClick={handleEventClick}
                  />
                )}
              </div>
            </div>
          </div>
        </main>
        <FilterDrawer />
      </div>
    );
  }

  // ── Mobile / tablet ────────────────────────────────────────────────────
  return (
    <div className="px-4 py-4 pb-24">
      <h1 className="text-xl font-bold mb-3">Events</h1>

      <TabToggle />
      <ControlsRow />

      {tab === "upcoming" && view === "calendar" && (
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

      {tab === "upcoming" ? (
        <EventList
          events={visibleEvents}
          isLoading={isLoading}
          onEventClick={handleEventClick}
          onCreateEvent={() => navigate("/events/new")}
        />
      ) : (
        <PastEventsList
          events={sortedPastEvents}
          isLoading={pastLoading}
          onEventClick={handleEventClick}
        />
      )}

      <FilterDrawer />
    </div>
  );
};

export default UpcomingEvents;
