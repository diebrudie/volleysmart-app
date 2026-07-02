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

/** Monday-first calendar cells for a month: leading nulls, then day dates. */
function buildMonthCells(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const leading = (first.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
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

  const min = minDate ? toDayStart(minDate) : null;
  const today = toDayStart(new Date());

  const openSheet = () => {
    const base = value ?? new Date();
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setOpen(true);
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
            style={({ pressed }) => [
              styles.navButton,
              pressed && { backgroundColor: t.surface },
            ]}
          >
            <Ionicons name={icons.chevronLeft} size={20} color={t.text} />
          </Pressable>
          <Text style={[styles.monthTitle, { color: t.text }]}>
            {monthTitle}
          </Text>
          <Pressable
            onPress={() => goMonth(1)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.navButton,
              pressed && { backgroundColor: t.surface },
            ]}
          >
            <Ionicons name={icons.chevronRight} size={20} color={t.text} />
          </Pressable>
        </View>

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
  monthTitle: {
    ...typography.h3,
    textTransform: "capitalize",
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
