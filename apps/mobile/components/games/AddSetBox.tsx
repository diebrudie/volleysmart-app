/**
 * "+ Add set" affordance for the Game detail screen (admin only).
 *
 * Mirrors the web AddSetBox (apps/web/src/components/match/AddSetBox.tsx): a
 * dashed, full-width box. Enablement (set 5 scored, under the max) is decided
 * by the screen and passed via `disabled`.
 */
import { Pressable, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { radii, spacing, typography } from "@/constants/theme";

type Props = {
  onPress: () => void;
  disabled?: boolean;
};

export function AddSetBox({ onPress, disabled = false }: Props) {
  const theme = useTheme();
  const { t } = useTranslation("games");

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={t("game.addSet", { defaultValue: "Add Set" })}
      style={({ pressed }) => [
        styles.box,
        {
          borderColor: theme.border,
          backgroundColor: theme.surface,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
      ]}
    >
      <Ionicons name="add" size={20} color={theme.text} />
      <Text style={[styles.label, { color: theme.text }]}>
        {t("game.addSet", { defaultValue: "Add Set" })}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: radii.lg,
    paddingVertical: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  label: {
    ...typography.body,
    fontWeight: "600",
  },
});
