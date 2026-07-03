import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { PlannedEvent } from "@volleysmart/core";
import {
  EventFormFields,
  defaultEventFormValues,
  type EventFormValues,
} from "@/components/events/form/EventFormFields";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { spacing } from "@/constants/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  event: PlannedEvent;
  /** Receives the edited form values; the caller runs the mutation (with scope). */
  onSave: (values: EventFormValues) => void;
  saving: boolean;
};

/** Parse "YYYY-MM-DD" as a local date (avoids UTC off-by-one). */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Map a PlannedEvent row onto the shared EventFormValues shape. */
function eventToFormValues(event: PlannedEvent): EventFormValues {
  return {
    ...defaultEventFormValues,
    title: event.title,
    eventType: event.event_type,
    date: parseLocalDate(event.date),
    startTime: event.start_time?.slice(0, 5) ?? "18:00",
    endTime: event.end_time?.slice(0, 5) ?? "20:00",
    rsvpDeadline: event.rsvp_deadline ? new Date(event.rsvp_deadline) : null,
    locationName: event.locations?.name ?? "",
    locationAddress: event.locations?.address ?? "",
    maxPlayers: event.max_players,
    isPublic: event.is_public,
    eventGender: event.event_gender ?? "mixed",
    isIndoor: (event.activity_type ?? "indoor") !== "beach",
    isOpponentMode: event.is_opponent_mode ?? false,
    opponentTeamName: event.opponent_team_name ?? "",
    notes: event.notes ?? "",
  };
}

/**
 * Edit-event bottom sheet, mirroring the web EventDetail EditEventSheet:
 * the shared EventFormFields fieldset (mode="edit") with a fixed Save button.
 * Recurring-scope selection happens BEFORE this sheet opens (RecurringScopeDialog).
 */
export function EditEventSheet({ visible, onClose, event, onSave, saving }: Props) {
  const { t } = useTranslation("events");
  const [values, setValues] = useState<EventFormValues>(() =>
    eventToFormValues(event)
  );

  // Reset the form each time the sheet opens (or the event row changes).
  useEffect(() => {
    if (visible) setValues(eventToFormValues(event));
  }, [visible, event]);

  const patch = (p: Partial<EventFormValues>) =>
    setValues((prev) => ({ ...prev, ...p }));

  const canSave = !!values.title.trim() && !saving;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t("detail.editEvent", { defaultValue: "Edit Event" })}
      snapToContent={false}
      maxHeightRatio={0.92}
    >
      <View style={styles.body}>
        <EventFormFields
          values={values}
          onChange={patch}
          mode="edit"
          hasClub={!!event.club_id}
          clubId={event.club_id}
        />
        <Button
          title={
            saving
              ? t("detail.saving", { defaultValue: "Saving..." })
              : t("detail.save", { defaultValue: "Save" })
          }
          onPress={() => onSave(values)}
          disabled={!canSave}
          loading={saving}
          style={styles.saveButton}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: spacing.xxl },
  saveButton: { marginTop: spacing.xl },
});
