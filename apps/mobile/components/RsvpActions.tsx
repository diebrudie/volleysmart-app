import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { type RsvpStatus } from "@volleysmart/core";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/hooks/useTheme";
import { spacing, typography } from "@/constants/theme";

type Props = {
  currentStatus: RsvpStatus | null;
  isPending: boolean;
  /** null withdraws the RSVP entirely (deleteRsvp). */
  onRsvp: (status: RsvpStatus | null) => void;
  /** Event cancelled or already past: everything disabled. */
  disabled?: boolean;
  /** rsvp_deadline has passed: RSVP is frozen (like the web deadline label). */
  deadlinePassed?: boolean;
  /** max_players reached: blocks a NEW "Going" (withdraw stays possible). */
  isFull?: boolean;
};

export function RsvpActions({
  currentStatus,
  isPending,
  onRsvp,
  disabled = false,
  deadlinePassed = false,
  isFull = false,
}: Props) {
  const { t } = useTranslation("events");
  const theme = useTheme();
  const isGoing = currentStatus === "attending";
  const isDeclined = currentStatus === "declined";

  const frozen = disabled || deadlinePassed;
  const goingDisabled = frozen || (isFull && !isGoing);
  const declineDisabled = frozen;

  const hint = deadlinePassed
    ? t("detail.rsvpDeadlinePassed", {
        defaultValue: "The RSVP deadline has passed",
      })
    : isFull && !isGoing
      ? t("detail.eventFull", { defaultValue: "This event is full" })
      : null;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Button
          title={t("detail.rsvpGoing", { defaultValue: "Going" })}
          variant={isGoing ? "primary" : "outline"}
          onPress={() => onRsvp(isGoing ? null : "attending")}
          loading={isPending}
          disabled={goingDisabled}
          style={styles.button}
        />
        <Button
          title={t("detail.rsvpNotGoing", { defaultValue: "Not Going" })}
          variant={isDeclined ? "danger" : "outline"}
          onPress={() => onRsvp(isDeclined ? null : "declined")}
          loading={isPending}
          disabled={declineDisabled}
          style={styles.button}
        />
      </View>
      {!disabled && hint ? (
        <Text style={[styles.hint, { color: theme.mutedForeground }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: { flexDirection: "row", gap: 12 },
  button: { flex: 1 },
  hint: { ...typography.caption, textAlign: "center" },
});
