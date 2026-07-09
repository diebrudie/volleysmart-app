/**
 * One selectable club member / attendee in the New Game player picker.
 *
 * Mirrors the web NewGame player list row (apps/web/src/pages/NewGame.tsx
 * :758-820): avatar-less name + primary position, tappable to toggle
 * selection, with a check indicator on the right. The whole row is the tap
 * target (web parity); there is no separate checkbox hit area.
 */
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "@/components/ui/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { radii, spacing, typography } from "@/constants/theme";

type Props = {
  name: string;
  /** Localized primary position (already resolved by the screen). */
  positionLabel?: string | null;
  imageUri?: string | null;
  selected: boolean;
  onToggle: () => void;
};

export function PlayerPickRow({
  name,
  positionLabel,
  imageUri,
  selected,
  onToggle,
}: Props) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: selected ? theme.primary : theme.cardBorder,
          backgroundColor: selected ? theme.muted : theme.card,
        },
        pressed && { backgroundColor: theme.surface },
      ]}
    >
      <Avatar uri={imageUri ?? undefined} name={name} size={40} />
      <View style={styles.textCol}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {name}
        </Text>
        {positionLabel ? (
          <Text
            style={[styles.position, { color: theme.mutedForeground }]}
            numberOfLines={1}
          >
            {positionLabel}
          </Text>
        ) : null}
      </View>
      <Ionicons
        name={selected ? "checkmark-circle" : "ellipse-outline"}
        size={24}
        color={selected ? theme.primary : theme.inputBorder}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  textCol: { flex: 1, gap: 2 },
  name: { ...typography.body, fontWeight: "600" },
  position: { ...typography.caption },
});
