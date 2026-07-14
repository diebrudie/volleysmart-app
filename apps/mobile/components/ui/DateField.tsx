import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { Sheet } from "@/components/ui/Sheet";
import { PickerField } from "@/components/ui/Select";
import { palette } from "@/constants/colors";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";

type Props = {
  label?: string;
  value: Date | null;
  onChange: (date: Date) => void;
  minDate?: Date;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
};

/** Strips the time part, keeping local year/month/day. */
function toDayStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Monday-first calendar cells for a month: leading nulls, then day dates.
 * Always padded to a constant 42 cells (6 rows) so the grid height never
 * changes between months that span 5 vs 6 week-rows.
 */
function buildMonthCells(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const leading = (first.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length < 42) cells.push(null); // 6 rows × 7 days
  return cells;
}

export function DateField({
  label,
  value,
  onChange,
  minDate,
  placeholder,
  error,
  disabled = false,
}: Props) {
  const t = useTheme();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  const [open, setOpen] = useState(false);

  const initial = value ?? new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  // "days" = month grid; "years" = pick a year first (avoids stepping month by
  // month across decades, e.g. a 1989 birthday).
  const [mode, setMode] = useState<"days" | "years">("days");

  const min = minDate ? toDayStart(minDate) : null;
  const today = toDayStart(new Date());

  // Year range: from minDate's year (or 1920 for open-ended fields like a
  // birthday) up to 10 years ahead (covers future event dates), newest first.
  const years = useMemo(() => {
    const maxYear = today.getFullYear() + 10;
    const minYear = min ? min.getFullYear() : 1920;
    const list: number[] = [];
    for (let y = maxYear; y >= minYear; y--) list.push(y);
    return list;
  }, [min, today]);

  const openSheet = () => {
    const base = value ?? new Date();
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setMode("days");
    setOpen(true);
  };

  const selectYear = (year: number) => {
    setViewYear(year);
    setMode("days");
  };

  const goMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const cells = useMemo(
    () => buildMonthCells(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  // Monday-first weekday headers (2024-01-01 is a Monday).
  const weekdayLabels = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        new Date(2024, 0, 1 + i).toLocaleDateString(locale, {
          weekday: "short",
        }),
      ),
    [locale],
  );

  const monthTitle = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    locale,
    { month: "long", year: "numeric" },
  );

  const valueText = value
    ? value.toLocaleDateString(locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const handleDayPress = (day: Date) => {
    onChange(day);
    setOpen(false);
  };

  return (
    <>
      <PickerField
        label={label}
        valueText={valueText}
        placeholder={placeholder}
        icon={icons.calendarDays}
        error={error}
        disabled={disabled}
        onPress={openSheet}
      />
      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        <View style={styles.monthHeader}>
          <Pressable
            onPress={() => goMonth(-1)}
            accessibilityRole="button"
            disabled={mode === "years"}
            style={({ pressed }) => [
              styles.navButton,
              mode === "years" && styles.navButtonHidden,
              pressed && { backgroundColor: t.surface },
            ]}
          >
            <Ionicons name={icons.chevronLeft} size={20} color={t.text} />
          </Pressable>
          <Pressable
            onPress={() => setMode(mode === "years" ? "days" : "years")}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.titlePress,
              pressed && { backgroundColor: t.surface },
            ]}
          >
            <Text style={[styles.monthTitle, { color: t.text }]}>
              {monthTitle}
            </Text>
            <Ionicons
              name={mode === "years" ? icons.chevronUp : icons.chevronDown}
              size={16}
              color={t.mutedForeground}
            />
          </Pressable>
          <Pressable
            onPress={() => goMonth(1)}
            accessibilityRole="button"
            disabled={mode === "years"}
            style={({ pressed }) => [
              styles.navButton,
              mode === "years" && styles.navButtonHidden,
              pressed && { backgroundColor: t.surface },
            ]}
          >
            <Ionicons name={icons.chevronRight} size={20} color={t.text} />
          </Pressable>
        </View>

        {mode === "years" ? (
          <View style={styles.yearGrid}>
            {years.map((year) => {
              const isSelected = year === viewYear;
              return (
                <View key={year} style={styles.yearCell}>
                  <Pressable
                    onPress={() => selectYear(year)}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.yearButton,
                      isSelected && { backgroundColor: t.primary },
                      pressed && !isSelected && { backgroundColor: t.surface },
                    ]}
                  >
                    <Text
                      style={[
                        styles.yearText,
                        { color: t.text },
                        isSelected && styles.dayTextSelected,
                      ]}
                    >
                      {year}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : (
        <View style={styles.grid}>
          {weekdayLabels.map((wd, i) => (
            <View key={`wd-${i}`} style={styles.cell}>
              <Text style={[styles.weekday, { color: t.mutedForeground }]}>
                {wd}
              </Text>
            </View>
          ))}
          {cells.map((day, i) => {
            if (!day) {
              return <View key={`empty-${i}`} style={styles.cell} />;
            }
            const isDisabled = min !== null && day < min;
            const isSelected = value !== null && isSameDay(day, value);
            const isToday = isSameDay(day, today);
            return (
              <View key={day.toISOString()} style={styles.cell}>
                <Pressable
                  onPress={() => handleDayPress(day)}
                  disabled={isDisabled}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.dayButton,
                    isToday && !isSelected && { borderColor: t.primary },
                    isSelected && { backgroundColor: t.primary },
                    pressed && !isSelected && { backgroundColor: t.surface },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: t.text },
                      isSelected && styles.dayTextSelected,
                      isDisabled && { color: t.placeholder },
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
        )}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  navButton: {
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  navButtonHidden: {
    opacity: 0,
  },
  titlePress: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  monthTitle: {
    ...typography.h3,
    textTransform: "capitalize",
  },
  yearGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingBottom: spacing.sm,
  },
  yearCell: {
    width: `${100 / 3}%`,
    padding: 4,
  },
  yearButton: {
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  yearText: {
    ...typography.body,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingBottom: spacing.sm,
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  weekday: {
    ...typography.caption,
    fontWeight: "600",
    paddingVertical: spacing.xs,
    textTransform: "capitalize",
  },
  dayButton: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  dayText: {
    ...typography.body,
  },
  dayTextSelected: {
    color: palette.white,
    fontWeight: "600",
  },
});
