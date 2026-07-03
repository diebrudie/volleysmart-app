import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { palette } from "@/constants/colors";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";
import { type PlannedEvent } from "@volleysmart/core";

/** Local YYYY-MM-DD key (no UTC shift). */
export const localDateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth() + n, 1);

/** Monday-first grid of days covering the whole month (plain Date math). */
const buildMonthGrid = (month: Date): Date[] => {
  const first = startOfMonth(month);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  // Monday-first offset: getDay() Sunday=0 -> 6, Monday=1 -> 0
  const leadDays = (first.getDay() + 6) % 7;
  const trailDays = 6 - ((last.getDay() + 6) % 7);
  const days: Date[] = [];
  for (
    let d = new Date(
      first.getFullYear(),
      first.getMonth(),
      first.getDate() - leadDays
    );
    days.length < leadDays + last.getDate() + trailDays;
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
  ) {
    days.push(new Date(d));
  }
  return days;
};

type Props = {
  events: PlannedEvent[];
  month: Date;
  onMonthChange: (d: Date) => void;
  /** Selected day as a YYYY-MM-DD key, or null. */
  selectedDay: string | null;
  /** Called with the day's YYYY-MM-DD key. Parent toggles selection. */
  onDaySelect: (dateKey: string) => void;
};

/**
 * Custom month-grid calendar with event dots per day.
 * Mirrors the web MiniCalendar (UpcomingEvents.tsx): Monday-first,
 * prev-month nav disabled at the current month, today highlighted.
 */
export function EventsCalendar({
  events,
  month,
  onMonthChange,
  selectedDay,
  onDaySelect,
}: Props) {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation("events");
  const locale = i18n.language || "en";

  const days = useMemo(() => buildMonthGrid(month), [month]);
  const eventDates = useMemo(
    () => new Set(events.map((e) => e.date)),
    [events]
  );

  const todayKey = localDateKey(new Date());
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(month);

  // Cannot navigate before the current month (web parity)
  const isAtCurrentMonth = startOfMonth(month) <= startOfMonth(new Date());

  // Monday-first weekday initials
  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
    // 2024-01-01 was a Monday
    return Array.from({ length: 7 }, (_, i) =>
      fmt.format(new Date(2024, 0, 1 + i))
    );
  }, [locale]);

  return (
    <View>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => onMonthChange(addMonths(month, -1))}
          disabled={isAtCurrentMonth}
          accessibilityRole="button"
          accessibilityLabel={tr("upcoming.previousMonth", {
            defaultValue: "Previous month",
          })}
          hitSlop={8}
          style={({ pressed }) => [
            styles.navButton,
            pressed && { backgroundColor: t.muted },
            isAtCurrentMonth && styles.navDisabled,
          ]}
        >
          <Ionicons name={icons.chevronLeft} size={18} color={t.text} />
        </Pressable>
        <Text style={[styles.monthLabel, { color: t.text }]}>
          {monthLabel}
        </Text>
        <Pressable
          onPress={() => onMonthChange(addMonths(month, 1))}
          accessibilityRole="button"
          accessibilityLabel={tr("upcoming.nextMonth", {
            defaultValue: "Next month",
          })}
          hitSlop={8}
          style={({ pressed }) => [
            styles.navButton,
            pressed && { backgroundColor: t.muted },
          ]}
        >
          <Ionicons name={icons.chevronRight} size={18} color={t.text} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {weekdayLabels.map((label, i) => (
          <Text
            key={i}
            style={[styles.weekdayLabel, { color: t.mutedForeground }]}
          >
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const dateKey = localDateKey(day);
          const hasEvent = eventDates.has(dateKey);
          const isSelected = selectedDay === dateKey;
          const isCurrentMonth = day.getMonth() === month.getMonth();
          const isToday = dateKey === todayKey;

          return (
            <Pressable
              key={dateKey}
              onPress={() => onDaySelect(dateKey)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.dayCell,
                isSelected
                  ? { backgroundColor: t.primary }
                  : isToday
                    ? { backgroundColor: t.muted }
                    : pressed
                      ? { backgroundColor: t.surface }
                      : null,
                !isCurrentMonth && styles.outsideMonth,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  { color: isSelected ? palette.white : t.text },
                ]}
              >
                {day.getDate()}
              </Text>
              {hasEvent ? (
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: isSelected
                        ? palette.white
                        : t.primary,
                    },
                  ]}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  navButton: {
    padding: spacing.xs,
    borderRadius: radii.md,
  },
  navDisabled: { opacity: 0.3 },
  monthLabel: { ...typography.bodySm, fontWeight: "600" },
  weekRow: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    ...typography.caption,
    fontSize: 10,
    fontWeight: "600",
    paddingVertical: spacing.xs,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    marginVertical: 1,
  },
  outsideMonth: { opacity: 0.3 },
  dayText: { ...typography.caption },
  dot: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: radii.full,
  },
});
