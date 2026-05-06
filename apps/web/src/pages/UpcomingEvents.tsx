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
  isWithinInterval,
} from "date-fns";
import { getDateLocale } from "@/lib/dateLocale";
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
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useCurrentPlayerId } from "@/hooks/useCurrentPlayerId";
import Navbar from "@/components/layout/Navbar";

// ─── Filter types ─────────────────────────────────────────────────────────
type RsvpFilterValue = "all" | "attending" | "declined" | "none";
type EventTypeValue =
  | "friendly_game"
  | "social_game"
  | "training"
  | "tournament";

const RSVP_OPTIONS: { value: RsvpFilterValue; labelKey: string }[] = [
  { value: "all", labelKey: "upcoming.rsvpAll" },
  { value: "attending", labelKey: "upcoming.rsvpGoing" },
  { value: "declined", labelKey: "upcoming.rsvpNotGoing" },
  { value: "none", labelKey: "upcoming.rsvpNotResponded" },
];

const EVENT_TYPE_OPTIONS: { value: EventTypeValue; labelKey: string }[] = [
  { value: "friendly_game", labelKey: "upcoming.eventTypeFriendly" },
  { value: "social_game", labelKey: "upcoming.eventTypeSocial" },
  { value: "training", labelKey: "upcoming.eventTypeTraining" },
  { value: "tournament", labelKey: "upcoming.eventTypeTournament" },
];

type MonthFilterValue = "all" | "current" | "last" | "next";
const MONTH_FILTER_OPTIONS: { value: MonthFilterValue; labelKey: string }[] = [
  { value: "all", labelKey: "upcoming.monthAll" },
  { value: "current", labelKey: "upcoming.monthCurrent" },
  { value: "last", labelKey: "upcoming.monthLast" },
  { value: "next", labelKey: "upcoming.monthNext" },
];

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
  const { t } = useTranslation("events");
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const eventDates = new Set(events.map((e) => e.date));
  const isAtCurrentMonth = monthStart <= startOfMonth(new Date());

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => onMonthChange(subMonths(month, 1))}
          disabled={isAtCurrentMonth}
          className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          aria-label={t("upcoming.previousMonth")}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">
          {format(month, "MMMM yyyy", { locale: getDateLocale() })}
        </span>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, 1))}
          className="p-1 rounded hover:bg-muted"
          aria-label={t("upcoming.nextMonth")}
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
  currentPlayerId?: string | null;
}> = ({
  events,
  isLoading,
  onEventClick,
  onCreateEvent,
  emptyLabel,
  currentPlayerId,
}) => {
  const { t } = useTranslation("events");
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
          <p className="font-medium">{emptyLabel || t("upcoming.noUpcomingEvents")}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t("upcoming.createToGetStarted")}
          </p>
        </div>
        <Button size="sm" onClick={onCreateEvent}>
          <Plus className="h-4 w-4 mr-1.5" />
          {t("upcoming.createEvent")}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          currentPlayerId={currentPlayerId}
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
  onViewDetails: (matchDayId: string) => void;
  onEventClick: (eventId: string) => void;
}> = ({ events, isLoading, onViewDetails, onEventClick }) => {
  const { t } = useTranslation("events");
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
        <p className="font-medium">{t("upcoming.noPastEvents")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Table header */}
      <div className="flex items-center gap-4 px-3 py-2 border-b">
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t("upcoming.tableDate")}
          </span>
        </div>
        <div className="shrink-0 w-16 text-center">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t("upcoming.tableScore")}
          </span>
        </div>
        <div className="shrink-0 w-20 text-right">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t("upcoming.tableDetails")}
          </span>
        </div>
      </div>

      {events.map((e, idx) => (
        <div
          key={e.id}
          className={cn(
            "flex items-center gap-4 px-3 py-3",
            idx < events.length - 1 && "border-b"
          )}
        >
          {/* Date + title (left) */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">
              {format(parseISO(e.date), "MMM. d, yyyy", { locale: getDateLocale() })}
            </p>
            <p className="text-sm font-medium text-primary truncate">
              {e.title}
            </p>
          </div>

          {/* Score (center) */}
          <div className="shrink-0 w-16 text-center">
            {e.status === "cancelled" ? (
              <span className="text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/40 px-1.5 py-0.5 rounded">
                {t("upcoming.cancelled")}
              </span>
            ) : e.has_score ? (
              <span className="text-base font-semibold tracking-wider">
                {e.team_a_wins} – {e.team_b_wins}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>

          {/* View button (right) — always visible */}
          <div className="shrink-0 w-20 flex justify-end">
            <button
              type="button"
              onClick={() =>
                e.match_day_id && e.status !== "cancelled"
                  ? onViewDetails(e.match_day_id)
                  : onEventClick(e.id)
              }
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              {t("upcoming.view")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────
const UpcomingEvents: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isCompact = useIsCompact();
  const { t } = useTranslation("events");

  // Restore tab from location state (e.g. coming back from GameDetail)
  const initialTab =
    (location.state as any)?.tab === "past" ? "past" : "upcoming";

  const [tab, setTab] = React.useState<"upcoming" | "past">(initialTab);
  const [view, setView] = React.useState<"list" | "calendar">("list");
  const [calendarMonth, setCalendarMonth] = React.useState(new Date());
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);
  const [sortAsc, setSortAsc] = React.useState(initialTab === "upcoming");
  const [filterOpen, setFilterOpen] = React.useState(false);

  // Filter state
  const [rsvpFilter, setRsvpFilter] = React.useState<RsvpFilterValue>("all");
  const [eventTypeFilters, setEventTypeFilters] = React.useState<
    Set<EventTypeValue>
  >(new Set());
  const [clubFilters, setClubFilters] = React.useState<Set<string>>(
    new Set()
  );
  const [monthFilter, setMonthFilter] =
    React.useState<MonthFilterValue>("all");

  // Data queries
  const { data: playerId } = useCurrentPlayerId();

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
    pastEvents.forEach((e) => {
      if (e.club_name) names.add(e.club_name);
    });
    return Array.from(names).sort();
  }, [events, pastEvents]);

  // Toggle helpers for checkbox sets
  const toggleEventType = React.useCallback((val: EventTypeValue) => {
    setEventTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  }, []);

  const toggleClub = React.useCallback((name: string) => {
    setClubFilters((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  // When switching tabs, set sort default (ASC for upcoming, DESC for past)
  const handleTabChange = React.useCallback(
    (newTab: "upcoming" | "past") => {
      setTab(newTab);
      setSortAsc(newTab === "upcoming");
    },
    []
  );

  // Month filter helper
  const monthInterval = React.useMemo(() => {
    if (monthFilter === "all") return null;
    const now = new Date();
    const base =
      monthFilter === "current"
        ? now
        : monthFilter === "last"
          ? subMonths(now, 1)
          : addMonths(now, 1);
    return { start: startOfMonth(base), end: endOfMonth(base) };
  }, [monthFilter]);

  // Filter + sort upcoming events
  const visibleEvents: PlannedEvent[] = React.useMemo(() => {
    let list = events;

    if (selectedDay && (view === "calendar" || !isCompact)) {
      list = list.filter(
        (e) => e.date === format(selectedDay, "yyyy-MM-dd")
      );
    }

    if (rsvpFilter !== "all" && playerId) {
      list = list.filter((e) => {
        const myStatus =
          e.event_rsvp?.find((r) => r.player_id === playerId)?.status ?? null;
        if (rsvpFilter === "none") return myStatus === null;
        return myStatus === rsvpFilter;
      });
    }

    if (eventTypeFilters.size > 0) {
      list = list.filter((e) =>
        eventTypeFilters.has(e.event_type as EventTypeValue)
      );
    }

    if (clubFilters.size > 0) {
      list = list.filter((e) => e.clubs?.name && clubFilters.has(e.clubs.name));
    }

    if (monthInterval) {
      list = list.filter((e) =>
        isWithinInterval(parseISO(e.date), monthInterval)
      );
    }

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
    eventTypeFilters,
    clubFilters,
    playerId,
    sortAsc,
    monthInterval,
  ]);

  // Filter + sort past events
  const sortedPastEvents: PastEventRow[] = React.useMemo(() => {
    let list = [...pastEvents];

    // RSVP filter — for past events, no RSVP counts as "declined"
    if (rsvpFilter !== "all") {
      list = list.filter((e) => {
        const status = e.rsvp_status; // null means never responded
        if (rsvpFilter === "none") return status === null;
        if (rsvpFilter === "declined")
          return status === "declined" || status === null;
        return status === rsvpFilter;
      });
    }

    // Apply event type filter
    if (eventTypeFilters.size > 0) {
      list = list.filter((e) =>
        eventTypeFilters.has(e.event_type as EventTypeValue)
      );
    }

    // Apply club filter
    if (clubFilters.size > 0) {
      list = list.filter(
        (e) => e.club_name && clubFilters.has(e.club_name)
      );
    }

    // Apply month filter
    if (monthInterval) {
      list = list.filter((e) =>
        isWithinInterval(parseISO(e.date), monthInterval)
      );
    }

    list.sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [pastEvents, sortAsc, rsvpFilter, eventTypeFilters, clubFilters, monthInterval]);

  const handleDaySelect = (day: Date) =>
    setSelectedDay((prev) => (prev && isSameDay(prev, day) ? null : day));

  const handleEventClick = (eventId: string) =>
    navigate(`/events/${eventId}`);

  const handleViewGameDetails = (matchDayId: string) =>
    navigate(`/game/${matchDayId}`, { state: { fromTab: "past" } });

  const activeFilterCount =
    (rsvpFilter !== "all" ? 1 : 0) +
    (eventTypeFilters.size > 0 ? 1 : 0) +
    (clubFilters.size > 0 ? 1 : 0) +
    (monthFilter !== "all" ? 1 : 0);

  // ── Tab toggle ──────────────────────────────────────────────────────────
  const TabToggle = React.useMemo(
    () => (
      <div className="flex border rounded-lg overflow-hidden mb-3">
        <button
          type="button"
          onClick={() => handleTabChange("upcoming")}
          className={cn(
            "flex-1 px-4 py-2 text-sm font-medium transition-colors",
            tab === "upcoming"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          {t("upcoming.tabUpcoming")}
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("past")}
          className={cn(
            "flex-1 px-4 py-2 text-sm font-medium transition-colors",
            tab === "past"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          {t("upcoming.tabPast")}
        </button>
      </div>
    ),
    [tab, handleTabChange, t]
  );

  // ── Controls row ────────────────────────────────────────────────────────
  const ControlsRow = React.useMemo(
    () => (
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSortAsc((prev) => !prev)}
            className="flex items-center justify-center h-8 w-8 border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            aria-label={sortAsc ? t("upcoming.sortDescending") : t("upcoming.sortAscending")}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {t("upcoming.filter")}
            {activeFilterCount > 0 && (
              <span className="ml-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

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
            {t("upcoming.viewList")}
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
            {t("upcoming.viewCalendar")}
          </button>
        </div>
      </div>
    ),
    [sortAsc, activeFilterCount, tab, view, t]
  );

  // ── Filter drawer ───────────────────────────────────────────────────────
  const filterDrawer = (
    <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-3 border-b">
          <SheetTitle>{t("upcoming.filtersTitle")}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* RSVP filter — dropdown */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("upcoming.filterRsvpStatus")}
            </p>
            <Select
              value={rsvpFilter}
              onValueChange={(v) => setRsvpFilter(v as RsvpFilterValue)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RSVP_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month filter — dropdown */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("upcoming.filterMonth")}
            </p>
            <Select
              value={monthFilter}
              onValueChange={(v) => setMonthFilter(v as MonthFilterValue)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Event type — checkboxes */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("upcoming.filterEventType")}
            </p>
            <div className="flex flex-col gap-2">
              {EVENT_TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2.5 cursor-pointer"
                >
                  <Checkbox
                    checked={eventTypeFilters.has(opt.value)}
                    onCheckedChange={() => toggleEventType(opt.value)}
                  />
                  <span className="text-sm">{t(opt.labelKey)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Club — checkboxes */}
          {clubNames.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("upcoming.filterClub")}
              </p>
              <div className="flex flex-col gap-2">
                {clubNames.map((name) => (
                  <label
                    key={name}
                    className="flex items-center gap-2.5 cursor-pointer"
                  >
                    <Checkbox
                      checked={clubFilters.has(name)}
                      onCheckedChange={() => toggleClub(name)}
                    />
                    <span className="text-sm">{name}</span>
                  </label>
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
                setEventTypeFilters(new Set());
                setClubFilters(new Set());
                setMonthFilter("all");
              }}
            >
              {t("upcoming.clearAllFilters")}
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
        <main className="flex-grow lg:ml-60">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold">{t("upcoming.title")}</h1>
              <Button onClick={() => navigate("/events/new")} size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                {t("upcoming.createEvent")}
              </Button>
            </div>

            <div className="flex gap-8">
              {/* Left: Calendar sidebar — always visible, disabled on past tab */}
              <aside className="w-64 shrink-0">
                <div
                  className={cn(
                    "rounded-2xl border bg-card p-4 sticky top-20",
                    tab === "past" && "opacity-50 pointer-events-none"
                  )}
                >
                  <MiniCalendar
                    events={events}
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    selectedDay={selectedDay}
                    onDaySelect={handleDaySelect}
                  />
                  {selectedDay && tab === "upcoming" && (
                    <button
                      type="button"
                      onClick={() => setSelectedDay(null)}
                      className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground"
                    >
                      {t("upcoming.clearFilter")}
                    </button>
                  )}
                </div>
              </aside>

              {/* Right: Tabs, controls, event list */}
              <div className="flex-1 min-w-0">
                {TabToggle}

                {/* Sort + Filter controls */}
                <div className="flex items-center gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setSortAsc((prev) => !prev)}
                    className="flex items-center justify-center h-8 w-8 border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                    aria-label={sortAsc ? t("upcoming.sortDescending") : t("upcoming.sortAscending")}
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    {t("upcoming.filter")}
                    {activeFilterCount > 0 && (
                      <span className="ml-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </div>

                {tab === "upcoming" ? (
                  <EventList
                    events={visibleEvents}
                    isLoading={isLoading}
                    onEventClick={handleEventClick}
                    onCreateEvent={() => navigate("/events/new")}
                    currentPlayerId={playerId}
                  />
                ) : (
                  <PastEventsList
                    events={sortedPastEvents}
                    isLoading={pastLoading}
                    onViewDetails={handleViewGameDetails}
                    onEventClick={handleEventClick}
                  />
                )}
              </div>
            </div>
          </div>
        </main>
        {filterDrawer}
      </div>
    );
  }

  // ── Mobile / tablet ────────────────────────────────────────────────────
  return (
    <div className="px-4 py-4 pb-24">
      <h1 className="text-xl font-bold mb-3">{t("upcoming.title")}</h1>

      {TabToggle}
      {ControlsRow}

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
              {t("upcoming.showAllEvents")}
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
          currentPlayerId={playerId}
        />
      ) : (
        <PastEventsList
          events={sortedPastEvents}
          isLoading={pastLoading}
          onViewDetails={handleViewGameDetails}
          onEventClick={handleEventClick}
        />
      )}

      {filterDrawer}
    </div>
  );
};

export default UpcomingEvents;
