import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/hooks/useTheme";
import type { EventEditScope } from "@/hooks/useEventMutations";
import { radii, spacing, typography } from "@/constants/theme";

type Props = {
  visible: boolean;
  /** Which action the scope applies to (title changes accordingly). */
  action: "edit" | "cancel";
  onClose: () => void;
  onSelect: (scope: EventEditScope) => void;
};

/**
 * Apple-Calendar-style scope picker shown before editing or cancelling a
 * recurring event: "This event only" vs "This and all future events".
 * Mirrors the web EventDetail recurrence scope dialog.
 */
export function RecurringScopeDialog({ visible, action, onClose, onSelect }: Props) {
  const { t } = useTranslation("events");
  const theme = useTheme();

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
            {action === "cancel"
              ? t("detail.cancelRecurringTitle", {
                  defaultValue: "Cancel recurring event",
                })
              : t("detail.editRecurringTitle", {
                  defaultValue: "Edit recurring event",
                })}
          </Text>
          <Button
            title={t("detail.thisEventOnly", { defaultValue: "This event only" })}
            variant="outline"
            onPress={() => onSelect("single")}
          />
          <Button
            title={t("detail.thisAndAllFuture", {
              defaultValue: "This and all future events",
            })}
            variant="outline"
            onPress={() => onSelect("series")}
          />
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
  title: { ...typography.h3, marginBottom: spacing.xs },
});
