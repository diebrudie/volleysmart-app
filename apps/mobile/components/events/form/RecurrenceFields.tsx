import { useMemo } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { Select } from "@/components/ui/Select";
import { useTheme } from "@/hooks/useTheme";
import { radii, spacing, typography } from "@/constants/theme";

/**
 * Recurrence configuration, mirroring the web CreateEvent recurrence block.
 * Only `rule` is persisted (createPlannedEvent takes recurrence_rule:
 * "weekly" | "monthly"); the remaining fields are display/config state,
 * exactly like the web page.
 */
export type RecurrenceValues = {
  rule: "weekly" | "monthly" | null;
  /** Weekly: repeat days, 0 = Monday … 6 = Sunday. */
  weeklyDays: number[];
  /** Monthly: single repeat day, 0 = Monday. */
  monthlyDay: number;
  /** Weekly interval label, mirrors web WEEKLY_EVERY. */
  everyWeek: string;
  /** Monthly ordinal label, mirrors web MONTHLY_EVERY. */
  everyMonth: string;
};

// Same untranslated literals as the web page (WEEKLY_EVERY / MONTHLY_EVERY).
export const WEEKLY_EVERY = ["1 week", "2 weeks", "3 weeks", "4 weeks"] as const;
export const MONTHLY_EVERY = ["1st", "2nd", "3rd", "4th", "Last"] as const;

export const defaultRecurrenceValues: RecurrenceValues = {
  rule: null,
  weeklyDays: [],
  monthlyDay: 0,
  everyWeek: WEEKLY_EVERY[0],
  everyMonth: MONTHLY_EVERY[0],
};

/** Convert JS getDay() (0=Sun) to Monday-first index (0=Mon). */
export function jsDayToIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

type Props = {
  value: RecurrenceValues;
  onChange: (patch: Partial<RecurrenceValues>) => void;
  /** The event date; used to default the repeat day when recurrence turns on. */
  eventDate: Date | null;
};

export function RecurrenceFields({ value, onChange, eventDate }: Props) {
  const { t, i18n } = useTranslation("events");
  const theme = useTheme();
  const locale = i18n.language;

  // Localized Monday-first weekday names (2024-01-01 is a Monday).
  const weekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: "long" })
      ),
    [locale]
  );
  const weekdaysShort = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: "short" })
      ),
    [locale]
  );

  const summary = !value.rule
    ? t("create.doesNotRepeat", { defaultValue: "Does not repeat" })
    : value.rule === "weekly"
      ? t("create.everyWeekday", {
          defaultValue: "Every {{days}}",
          days:
            value.weeklyDays.length > 0
              ? value.weeklyDays.map((d) => weekdays[d]).join(", ")
              : eventDate
                ? eventDate.toLocaleDateString(locale, { weekday: "long" })
                : "",
        })
      : // "ordinal" is a reserved (boolean) i18next option name, so the
        // options object needs a cast even though the locale string uses it.
        (t(
          "create.monthlyPattern",
          {
            defaultValue: "{{ordinal}} {{day}} of every month",
            ordinal: value.everyMonth,
            day: weekdays[value.monthlyDay],
          } as never
        ) as unknown as string);

  const handleToggle = (on: boolean) => {
    if (on) {
      const dayIdx = eventDate ? jsDayToIndex(eventDate.getDay()) : 0;
      onChange({
        rule: "weekly",
        weeklyDays: value.weeklyDays.length > 0 ? value.weeklyDays : [dayIdx],
        monthlyDay: dayIdx,
      });
    } else {
      onChange({ rule: null });
    }
  };

  const weekdayOptions = weekdays.map((label, i) => ({ label, value: i }));
  const weeklyEveryOptions = WEEKLY_EVERY.map((label) => ({
    label,
    value: label,
  }));
  const monthlyEveryOptions = MONTHLY_EVERY.map((label) => ({
    label,
    value: label,
  }));

  const repeatsOnLabel = t("create.repeatsOn", { defaultValue: "Repeats on" });
  const everyLabel = t("create.every", { defaultValue: "Every" });

  return (
    <View
      style={[
        styles.card,
        { borderColor: theme.cardBorder, backgroundColor: theme.card },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]}>
            {t("create.recurring", { defaultValue: "Recurring" })}
          </Text>
          <Text style={[styles.summary, { color: theme.mutedForeground }]}>
            {summary}
          </Text>
        </View>
        <Switch
          value={!!value.rule}
          onValueChange={handleToggle}
          trackColor={{ false: theme.muted, true: theme.primary }}
          thumbColor={theme.background}
        />
      </View>

      {value.rule ? (
        <>
          <SegmentedTabs
            segments={[
              { key: "weekly", label: t("create.weekly", { defaultValue: "Weekly" }) },
              { key: "monthly", label: t("create.monthly", { defaultValue: "Monthly" }) },
            ]}
            activeKey={value.rule}
            onChange={(key) => onChange({ rule: key as "weekly" | "monthly" })}
          />

          <View style={styles.row}>
            <View style={styles.rowItem}>
              {value.rule === "weekly" ? (
                <Select
                  multiple
                  label={repeatsOnLabel}
                  sheetTitle={repeatsOnLabel}
                  placeholder={t("create.select", { defaultValue: "Select" })}
                  options={weekdayOptions.map((o) => ({
                    ...o,
                    label: o.label,
                  }))}
                  value={value.weeklyDays}
                  onChange={(days) =>
                    onChange({ weeklyDays: [...days].sort((a, b) => a - b) })
                  }
                />
              ) : (
                <Select
                  label={repeatsOnLabel}
                  sheetTitle={repeatsOnLabel}
                  options={weekdayOptions}
                  value={value.monthlyDay}
                  onChange={(day) => onChange({ monthlyDay: day })}
                />
              )}
            </View>
            <View style={styles.rowItem}>
              {value.rule === "weekly" ? (
                <Select
                  label={everyLabel}
                  sheetTitle={t("create.repeatsEvery", {
                    defaultValue: "Repeats Every",
                  })}
                  options={weeklyEveryOptions}
                  value={value.everyWeek}
                  onChange={(v) => onChange({ everyWeek: v })}
                />
              ) : (
                <Select
                  label={everyLabel}
                  sheetTitle={t("create.repeatsEvery", {
                    defaultValue: "Repeats Every",
                  })}
                  options={monthlyEveryOptions}
                  value={value.everyMonth}
                  onChange={(v) => onChange({ everyMonth: v })}
                />
              )}
            </View>
          </View>

          {value.rule === "weekly" && value.weeklyDays.length > 0 ? (
            <Text style={[styles.daysHint, { color: theme.mutedForeground }]}>
              {value.weeklyDays.map((d) => weekdaysShort[d]).join(", ")}
            </Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  headerText: { flex: 1, gap: 2 },
  title: { ...typography.bodySm, fontWeight: "600" },
  summary: { ...typography.caption },
  row: { flexDirection: "row", gap: spacing.md },
  rowItem: { flex: 1 },
  daysHint: { ...typography.caption },
});
