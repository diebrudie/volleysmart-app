import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { spacing, typography } from "@/constants/theme";
import { Sheet } from "@/components/ui/Sheet";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";

// ─── Filter types (mirrors apps/web/src/pages/UpcomingEvents.tsx) ────────
export type RsvpFilterValue = "all" | "attending" | "declined" | "none";
export type MonthFilterValue = "all" | "current" | "last" | "next";
export type EventTypeValue =
  | "friendly_game"
  | "social_game"
  | "training"
  | "tournament";

export const EVENT_TYPE_VALUES: EventTypeValue[] = [
  "friendly_game",
  "social_game",
  "training",
  "tournament",
];

type Props = {
  visible: boolean;
  onClose: () => void;
  /** RSVP option labels differ between tabs (Going vs Attended). */
  tab: "upcoming" | "past";
  rsvpFilter: RsvpFilterValue;
  onRsvpFilterChange: (v: RsvpFilterValue) => void;
  monthFilter: MonthFilterValue;
  onMonthFilterChange: (v: MonthFilterValue) => void;
  eventTypeFilters: EventTypeValue[];
  onToggleEventType: (v: EventTypeValue) => void;
  clubNames: string[];
  clubFilters: string[];
  onToggleClub: (name: string) => void;
  activeFilterCount: number;
  onClearAll: () => void;
};

/**
 * Bottom-sheet filter panel for the Events tab. Mirrors the web filter
 * drawer: RSVP status + month as dropdowns, event type + club as checkboxes,
 * clear-all button when any filter is active.
 */
export function EventFilterSheet({
  visible,
  onClose,
  tab,
  rsvpFilter,
  onRsvpFilterChange,
  monthFilter,
  onMonthFilterChange,
  eventTypeFilters,
  onToggleEventType,
  clubNames,
  clubFilters,
  onToggleClub,
  activeFilterCount,
  onClearAll,
}: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation("events");

  const rsvpOptions: { label: string; value: RsvpFilterValue }[] = [
    { value: "all", label: tr("upcoming.rsvpAll", { defaultValue: "All" }) },
    {
      value: "attending",
      label:
        tab === "past"
          ? tr("upcoming.rsvpAttended", { defaultValue: "Attended" })
          : tr("upcoming.rsvpGoing", { defaultValue: "Going" }),
    },
    {
      value: "declined",
      label:
        tab === "past"
          ? tr("upcoming.rsvpNotAttended", { defaultValue: "Not attended" })
          : tr("upcoming.rsvpNotGoing", { defaultValue: "Not going" }),
    },
    {
      value: "none",
      label: tr("upcoming.rsvpNotResponded", {
        defaultValue: "Not responded",
      }),
    },
  ];

  const monthOptions: { label: string; value: MonthFilterValue }[] = [
    {
      value: "all",
      label: tr("upcoming.monthAll", { defaultValue: "All months" }),
    },
    {
      value: "current",
      label: tr("upcoming.monthCurrent", { defaultValue: "This month" }),
    },
    {
      value: "last",
      label: tr("upcoming.monthLast", { defaultValue: "Last month" }),
    },
    {
      value: "next",
      label: tr("upcoming.monthNext", { defaultValue: "Next month" }),
    },
  ];

  const eventTypeOptions: { label: string; value: EventTypeValue }[] = [
    {
      value: "friendly_game",
      label: tr("upcoming.eventTypeFriendly", {
        defaultValue: "Friendly Game",
      }),
    },
    {
      value: "social_game",
      label: tr("upcoming.eventTypeSocial", { defaultValue: "Social Game" }),
    },
    {
      value: "training",
      label: tr("upcoming.eventTypeTraining", { defaultValue: "Training" }),
    },
    {
      value: "tournament",
      label: tr("upcoming.eventTypeTournament", {
        defaultValue: "Tournament",
      }),
    },
  ];

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={tr("upcoming.filtersTitle", { defaultValue: "Filters" })}
    >
      <View style={styles.body}>
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: t.mutedForeground }]}>
            {tr("upcoming.filterRsvpStatus", { defaultValue: "RSVP Status" })}
          </Text>
          <Select
            value={rsvpFilter}
            onChange={onRsvpFilterChange}
            options={rsvpOptions}
            sheetTitle={tr("upcoming.filterRsvpStatus", {
              defaultValue: "RSVP Status",
            })}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: t.mutedForeground }]}>
            {tr("upcoming.filterMonth", { defaultValue: "Month" })}
          </Text>
          <Select
            value={monthFilter}
            onChange={onMonthFilterChange}
            options={monthOptions}
            sheetTitle={tr("upcoming.filterMonth", { defaultValue: "Month" })}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: t.mutedForeground }]}>
            {tr("upcoming.filterEventType", { defaultValue: "Event Type" })}
          </Text>
          <View style={styles.checkboxList}>
            {eventTypeOptions.map((opt) => (
              <Checkbox
                key={opt.value}
                label={opt.label}
                checked={eventTypeFilters.includes(opt.value)}
                onChange={() => onToggleEventType(opt.value)}
              />
            ))}
          </View>
        </View>

        {clubNames.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: t.mutedForeground }]}>
              {tr("upcoming.filterClub", { defaultValue: "Club" })}
            </Text>
            <View style={styles.checkboxList}>
              {clubNames.map((name) => (
                <Checkbox
                  key={name}
                  label={name}
                  checked={clubFilters.includes(name)}
                  onChange={() => onToggleClub(name)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {activeFilterCount > 0 ? (
          <Button
            title={tr("upcoming.clearAllFilters", {
              defaultValue: "Clear all filters",
            })}
            variant="outline"
            onPress={onClearAll}
          />
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.xl,
    paddingBottom: spacing.sm,
  },
  section: { gap: spacing.sm },
  sectionLabel: {
    ...typography.label,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  checkboxList: { gap: spacing.md },
});
