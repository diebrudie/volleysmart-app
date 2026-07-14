import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Screen } from "@/components/ui/Screen";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { useTheme } from "@/hooks/useTheme";
import { palette } from "@/constants/colors";
import { icons, type IoniconsName } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";
import { queryKeys } from "@/constants/queryKeys";
import { useCurrentPlayerId } from "@/hooks/useCurrentPlayerId";
import { useUpcomingEvents } from "@/hooks/useUpcomingEvents";
import { usePastEvents } from "@/hooks/usePastEvents";
import { useUserClubs } from "@/hooks/useUserClubs";
import { EventCard } from "@/components/EventCard";
import {
  EventFilterSheet,
  type EventTypeValue,
  type MonthFilterValue,
  type RsvpFilterValue,
} from "@/components/events/EventFilterSheet";
import {
  EventsCalendar,
  localDateKey,
} from "@/components/events/EventsCalendar";
import { PastEventsTable } from "@/components/events/PastEventsTable";
import { type PlannedEvent } from "@volleysmart/core";

const SORT_ICON: IoniconsName = icons.arrowUpDown;

type TabValue = "upcoming" | "past";
type ViewValue = "list" | "calendar";

/** Inclusive YYYY-MM-DD key range for the month filter (plain Date math). */
const monthKeyRange = (
  filter: MonthFilterValue
): { start: string; end: string } | null => {
  if (filter === "all") return null;
  const now = new Date();
  const offset = filter === "current" ? 0 : filter === "last" ? -1 : 1;
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { start: localDateKey(start), end: localDateKey(end) };
};

export default function EventsScreen() {
  const { t } = useTranslation("events");
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: playerId } = useCurrentPlayerId();

  const [tab, setTab] = useState<TabValue>("upcoming");
  const [view, setView] = useState<ViewValue>("list");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [rsvpFilter, setRsvpFilter] = useState<RsvpFilterValue>("all");
  const [monthFilter, setMonthFilter] = useState<MonthFilterValue>("all");
  const [eventTypeFilters, setEventTypeFilters] = useState<EventTypeValue[]>(
    []
  );
  const [clubFilters, setClubFilters] = useState<string[]>([]);

  const { data: events = [], isLoading } = useUpcomingEvents();
  const { data: pastEvents = [], isLoading: pastLoading } = usePastEvents({
    enabled: tab === "past",
  });
  const { data: userClubs } = useUserClubs();

  // Club names for the filter (user's clubs + any club appearing on events)
  const clubNames = useMemo(() => {
    const names = new Set<string>();
    (userClubs ?? []).forEach((m) => {
      if (m.clubs?.name) names.add(m.clubs.name);
    });
    events.forEach((e) => {
      if (e.clubs?.name) names.add(e.clubs.name);
    });
    pastEvents.forEach((e) => {
      if (e.club_name) names.add(e.club_name);
    });
    return Array.from(names).sort();
  }, [userClubs, events, pastEvents]);

  const activeFilterCount =
    (rsvpFilter !== "all" ? 1 : 0) +
    (eventTypeFilters.length > 0 ? 1 : 0) +
    (clubFilters.length > 0 ? 1 : 0) +
    (monthFilter !== "all" ? 1 : 0);

  const monthRange = useMemo(() => monthKeyRange(monthFilter), [monthFilter]);

  // ── Filter + sort upcoming (mirrors web UpcomingEvents.tsx) ─────────────
  const visibleEvents = useMemo(() => {
    let list = events;

    if (selectedDay && view === "calendar") {
      list = list.filter((e) => e.date === selectedDay);
    }

    if (rsvpFilter !== "all" && playerId) {
      list = list.filter((e) => {
        const myStatus =
          e.event_rsvp?.find((r) => r.player_id === playerId)?.status ?? null;
        if (rsvpFilter === "none") return myStatus === null;
        return myStatus === rsvpFilter;
      });
    }

    if (eventTypeFilters.length > 0) {
      list = list.filter((e) =>
        eventTypeFilters.includes(e.event_type as EventTypeValue)
      );
    }

    if (clubFilters.length > 0) {
      list = list.filter(
        (e) => e.clubs?.name && clubFilters.includes(e.clubs.name)
      );
    }

    if (monthRange) {
      list = list.filter(
        (e) => e.date >= monthRange.start && e.date <= monthRange.end
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
    monthRange,
  ]);

  // ── Filter + sort past (mirrors web: no RSVP counts as "declined") ──────
  const sortedPastEvents = useMemo(() => {
    let list = [...pastEvents];

    if (rsvpFilter !== "all") {
      list = list.filter((e) => {
        const status = e.rsvp_status;
        if (rsvpFilter === "none") return status === null;
        if (rsvpFilter === "declined")
          return status === "declined" || status === null;
        return status === rsvpFilter;
      });
    }

    if (eventTypeFilters.length > 0) {
      list = list.filter((e) =>
        eventTypeFilters.includes(e.event_type as EventTypeValue)
      );
    }

    if (clubFilters.length > 0) {
      list = list.filter(
        (e) => e.club_name && clubFilters.includes(e.club_name)
      );
    }

    if (monthRange) {
      list = list.filter(
        (e) => e.date >= monthRange.start && e.date <= monthRange.end
      );
    }

    list.sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [
    pastEvents,
    sortAsc,
    rsvpFilter,
    eventTypeFilters,
    clubFilters,
    monthRange,
  ]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleTabChange = useCallback((key: string) => {
    const next = key as TabValue;
    setTab(next);
    // Web parity: ASC for upcoming, DESC for past; RSVP filter resets
    setSortAsc(next === "upcoming");
    setRsvpFilter("all");
  }, []);

  const handleDaySelect = useCallback((dateKey: string) => {
    setSelectedDay((prev) => (prev === dateKey ? null : dateKey));
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.allUpcoming,
      }),
      queryClient.invalidateQueries({ queryKey: queryKeys.events.allPast }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  const clearAllFilters = useCallback(() => {
    setRsvpFilter("all");
    setMonthFilter("all");
    setEventTypeFilters([]);
    setClubFilters([]);
  }, []);

  const toggleEventType = useCallback((v: EventTypeValue) => {
    setEventTypeFilters((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  }, []);

  const toggleClub = useCallback((name: string) => {
    setClubFilters((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  }, []);

  const handleEventPress = useCallback(
    (eventId: string) => router.push(`/events/${eventId}`),
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: PlannedEvent }) => (
      <EventCard
        event={item}
        currentPlayerId={playerId}
        onPress={() => handleEventPress(item.id)}
      />
    ),
    [playerId, handleEventPress]
  );

  // ── Header (tabs + controls + calendar + past table) ────────────────────
  const listHeader = (
    <View style={styles.header}>
      <SegmentedTabs
        segments={[
          {
            key: "upcoming",
            label: t("upcoming.tabUpcoming", { defaultValue: "Upcoming" }),
          },
          {
            key: "past",
            label: t("upcoming.tabPast", { defaultValue: "Past events" }),
          },
        ]}
        activeKey={tab}
        onChange={handleTabChange}
      />

      {/* Controls row: sort + filter | list/calendar toggle */}
      <View style={styles.controlsRow}>
        <View style={styles.controlsLeft}>
          <Pressable
            onPress={() => setSortAsc((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={
              sortAsc
                ? t("upcoming.sortDescending", {
                    defaultValue: "Sort descending",
                  })
                : t("upcoming.sortAscending", {
                    defaultValue: "Sort ascending",
                  })
            }
            style={({ pressed }) => [
              styles.iconButton,
              { borderColor: theme.cardBorder },
              pressed && { backgroundColor: theme.muted },
            ]}
          >
            <Ionicons name={SORT_ICON} size={15} color={theme.textSecondary} />
          </Pressable>

          <Pressable
            onPress={() => setFilterOpen(true)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.filterButton,
              { borderColor: theme.cardBorder },
              pressed && { backgroundColor: theme.muted },
            ]}
          >
            <Ionicons
              name={icons.filter}
              size={14}
              color={theme.textSecondary}
            />
            <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>
              {t("upcoming.filter", { defaultValue: "Filter" })}
            </Text>
            {activeFilterCount > 0 ? (
              <View
                style={[styles.countBadge, { backgroundColor: theme.primary }]}
              >
                <Text style={styles.countBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {/* List / calendar view toggle (disabled on past tab) */}
        <View
          style={[
            styles.viewToggle,
            { borderColor: theme.cardBorder },
            tab === "past" && styles.viewToggleDisabled,
          ]}
          pointerEvents={tab === "past" ? "none" : "auto"}
        >
          <Pressable
            onPress={() => setView("list")}
            accessibilityRole="button"
            accessibilityLabel={t("upcoming.viewList", {
              defaultValue: "List",
            })}
            style={[
              styles.viewToggleSegment,
              view === "list" && { backgroundColor: theme.primary },
            ]}
          >
            <Ionicons
              name={icons.listChecks}
              size={15}
              color={view === "list" ? palette.white : theme.textSecondary}
            />
          </Pressable>
          <Pressable
            onPress={() => setView("calendar")}
            accessibilityRole="button"
            accessibilityLabel={t("upcoming.viewCalendar", {
              defaultValue: "Calendar",
            })}
            style={[
              styles.viewToggleSegment,
              view === "calendar" && { backgroundColor: theme.primary },
            ]}
          >
            <Ionicons
              name={icons.calendarDays}
              size={15}
              color={view === "calendar" ? palette.white : theme.textSecondary}
            />
          </Pressable>
        </View>
      </View>

      {/* Calendar (upcoming tab, calendar view) */}
      {tab === "upcoming" && view === "calendar" ? (
        <View
          style={[
            styles.calendarCard,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
          ]}
        >
          <EventsCalendar
            events={events}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            selectedDay={selectedDay}
            onDaySelect={handleDaySelect}
          />
          {selectedDay ? (
            <Pressable
              onPress={() => setSelectedDay(null)}
              accessibilityRole="button"
              style={styles.showAllButton}
            >
              <Text
                style={[styles.showAllText, { color: theme.mutedForeground }]}
              >
                {t("upcoming.showAllEvents", {
                  defaultValue: "Show all events",
                })}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Past tab content lives in the header (compact table) */}
      {tab === "past" ? (
        pastLoading ? (
          <View style={styles.pastSpinner}>
            <Spinner />
          </View>
        ) : sortedPastEvents.length > 0 ? (
          <PastEventsTable
            events={sortedPastEvents}
            onRowPress={handleEventPress}
          />
        ) : (
          <EmptyState
            icon={
              <Ionicons
                name={icons.calendarDays}
                size={44}
                color={theme.mutedForeground}
              />
            }
            title={t("upcoming.noPastEvents", {
              defaultValue: "No past events",
            })}
          />
        )
      ) : null}
    </View>
  );

  return (
    <Screen scroll={false} padded={false} safeTop={false}>
      {isLoading && !events.length && tab === "upcoming" ? (
        <Spinner />
      ) : (
        <FlatList
          data={tab === "upcoming" ? visibleEvents : []}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={listHeader}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            tab === "upcoming" ? (
              <EmptyState
                icon={
                  <Ionicons
                    name={icons.calendarDays}
                    size={44}
                    color={theme.mutedForeground}
                  />
                }
                title={t("upcoming.noUpcomingEvents", {
                  defaultValue: "No upcoming events",
                })}
                subtitle={t("upcoming.createToGetStarted", {
                  defaultValue: "Create one to get started",
                })}
              />
            ) : null
          }
        />
      )}

      <EventFilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        tab={tab}
        rsvpFilter={rsvpFilter}
        onRsvpFilterChange={setRsvpFilter}
        monthFilter={monthFilter}
        onMonthFilterChange={setMonthFilter}
        eventTypeFilters={eventTypeFilters}
        onToggleEventType={toggleEventType}
        clubNames={clubNames}
        clubFilters={clubFilters}
        onToggleClub={toggleClub}
        activeFilterCount={activeFilterCount}
        onClearAll={clearAllFilters}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  header: { gap: spacing.md },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  controlsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconButton: {
    height: 32,
    width: 32,
    borderWidth: 1,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    height: 32,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radii.lg,
  },
  filterLabel: { ...typography.caption, fontWeight: "600" },
  countBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: palette.white,
  },
  viewToggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  viewToggleDisabled: { opacity: 0.4 },
  viewToggleSegment: {
    height: 32,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarCard: {
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  showAllButton: {
    marginTop: spacing.sm,
    alignItems: "center",
  },
  showAllText: { ...typography.caption },
  pastSpinner: { paddingVertical: spacing.xxxl },
});
