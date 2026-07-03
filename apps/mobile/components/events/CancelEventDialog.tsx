import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useTheme } from "@/hooks/useTheme";
import { radii, spacing, typography } from "@/constants/theme";

const COMMENT_MAX = 200;

type Props = {
  visible: boolean;
  onClose: () => void;
  loading: boolean;
  /** reason is the English DB value (same as web); comment is optional. */
  onConfirm: (reason: string, comment: string) => void;
};

/**
 * Cancel-event dialog mirroring the web EventDetail cancel dialog:
 * preset reason Select (values stored in English, labels translated)
 * + optional comment (required when reason is "Other").
 */
export function CancelEventDialog({ visible, onClose, loading, onConfirm }: Props) {
  const { t } = useTranslation("events");
  const theme = useTheme();
  const [reason, setReason] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (visible) {
      setReason(null);
      setComment("");
    }
  }, [visible]);

  // DB values are English strings (matches web CANCELLATION_REASON_KEYS).
  const reasonOptions = [
    {
      value: "Not enough players",
      label: t("detail.reasonNotEnoughPlayers", { defaultValue: "Not enough players" }),
    },
    {
      value: "Bad weather",
      label: t("detail.reasonBadWeather", { defaultValue: "Bad weather" }),
    },
    {
      value: "Venue unavailable",
      label: t("detail.reasonVenueUnavailable", { defaultValue: "Venue unavailable" }),
    },
    {
      value: "Scheduling conflict",
      label: t("detail.reasonSchedulingConflict", { defaultValue: "Scheduling conflict" }),
    },
    {
      value: "Other",
      label: t("detail.reasonOther", { defaultValue: "Other" }),
    },
  ];

  const canConfirm =
    !!reason && (reason !== "Other" || !!comment.trim()) && !loading;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: theme.overlay }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
        />
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
          ]}
        >
          <Text style={[styles.title, { color: theme.text }]}>
            {t("detail.cancelDialogTitle", { defaultValue: "Cancel event" })}
          </Text>
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            {t("detail.cancelDialogDescription", {
              defaultValue: "Select a reason for cancelling this event.",
            })}
          </Text>

          <Select
            placeholder={t("detail.selectReason", { defaultValue: "Select a reason" })}
            sheetTitle={t("detail.selectReason", { defaultValue: "Select a reason" })}
            options={reasonOptions}
            value={reason}
            onChange={(v) => setReason(v)}
          />

          <TextInput
            value={comment}
            onChangeText={(text) => setComment(text.slice(0, COMMENT_MAX))}
            placeholder={
              reason === "Other"
                ? t("detail.cancelCommentOtherPlaceholder", {
                    defaultValue: "Please describe the reason (required)",
                  })
                : t("detail.cancelCommentPlaceholder", {
                    defaultValue: "Additional comment (optional)",
                  })
            }
            placeholderTextColor={theme.placeholder}
            multiline
            maxLength={COMMENT_MAX}
            textAlignVertical="top"
            style={[
              styles.commentInput,
              {
                color: theme.text,
                borderColor: theme.inputBorder,
                backgroundColor: theme.inputBackground,
              },
            ]}
          />

          <View style={styles.buttons}>
            <Button
              title={t("detail.back", { defaultValue: "Back" })}
              variant="outline"
              onPress={onClose}
              style={styles.button}
            />
            <Button
              title={
                loading
                  ? t("detail.cancelling", { defaultValue: "Cancelling..." })
                  : t("detail.cancelEventButton", { defaultValue: "Cancel Event" })
              }
              variant="danger"
              onPress={() => reason && onConfirm(reason, comment.trim())}
              disabled={!canConfirm}
              loading={loading}
              style={styles.button}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.xxl,
    gap: spacing.md,
  },
  title: { ...typography.h3 },
  message: { ...typography.body, lineHeight: 21 },
  commentInput: {
    ...typography.body,
    minHeight: 88,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  buttons: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  button: { flex: 1 },
});
