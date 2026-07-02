import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { palette } from "@/constants/colors";
import { icons, type IconKey } from "@/constants/icons";
import { radii, spacing } from "@/constants/theme";

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconKey;
  /** Optional count badge shown after the label. */
  count?: number;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  count,
  disabled = false,
  style,
}: Props) {
  const t = useTheme();

  const textColor = selected ? palette.white : t.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? t.primary : t.muted,
          borderColor: selected ? t.primary : t.cardBorder,
        },
        pressed && !selected && { backgroundColor: t.surface },
        pressed && selected && { backgroundColor: t.primaryPressed },
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icons[icon]}
          size={14}
          color={selected ? palette.white : t.textSecondary}
        />
      ) : null}
      <Text numberOfLines={1} style={[styles.label, { color: textColor }]}>
        {label}
      </Text>
      {typeof count === "number" ? (
        <View
          style={[
            styles.countBadge,
            {
              backgroundColor: selected
                ? "rgba(255, 255, 255, 0.25)"
                : t.background,
            },
          ]}
        >
          <Text style={[styles.countText, { color: textColor }]}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  countText: {
    fontSize: 11,
    fontWeight: "600",
  },
  disabled: { opacity: 0.5 },
});
