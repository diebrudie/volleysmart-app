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
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/Button";
import { radii, spacing, typography } from "@/constants/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm button as a danger button. */
  destructive?: boolean;
  /** Shows a loading spinner on the confirm button. */
  loading?: boolean;
  /**
   * Called on confirm. When `withReasonInput` is set, receives the
   * (trimmed) text the user typed; otherwise receives undefined.
   */
  onConfirm: (reason?: string) => void;
  /** Adds a multiline text input whose value is passed to onConfirm. */
  withReasonInput?: boolean;
  reasonPlaceholder?: string;
};

export function Dialog({
  visible,
  onClose,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  loading = false,
  onConfirm,
  withReasonInput = false,
  reasonPlaceholder,
}: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (visible) setReason("");
  }, [visible]);

  const handleConfirm = () => {
    onConfirm(withReasonInput ? reason.trim() : undefined);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: t.overlay }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
        />
        <View
          style={[
            styles.card,
            { backgroundColor: t.card, borderColor: t.cardBorder },
          ]}
        >
          <Text style={[styles.title, { color: t.text }]}>{title}</Text>
          {message ? (
            <Text style={[styles.message, { color: t.textSecondary }]}>
              {message}
            </Text>
          ) : null}

          {withReasonInput ? (
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder={reasonPlaceholder}
              placeholderTextColor={t.placeholder}
              multiline
              textAlignVertical="top"
              style={[
                styles.reasonInput,
                {
                  color: t.text,
                  borderColor: t.inputBorder,
                  backgroundColor: t.inputBackground,
                },
              ]}
            />
          ) : null}

          <View style={styles.buttons}>
            <Button
              title={
                cancelLabel ?? tr("common:cancel", { defaultValue: "Cancel" })
              }
              variant="outline"
              onPress={onClose}
              style={styles.button}
            />
            <Button
              title={
                confirmLabel ??
                tr("common:confirm", { defaultValue: "Confirm" })
              }
              variant={destructive ? "danger" : "primary"}
              loading={loading}
              onPress={handleConfirm}
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
  title: {
    ...typography.h3,
  },
  message: {
    ...typography.body,
    lineHeight: 21,
  },
  reasonInput: {
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
