import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { palette } from "@/constants/colors";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
  style,
}: Props) {
  const t = useTheme();

  return (
    <Pressable
      onPress={() => onChange(!checked)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      hitSlop={6}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.box,
          {
            borderColor: checked ? t.primary : t.inputBorder,
            backgroundColor: checked ? t.primary : t.inputBackground,
          },
        ]}
      >
        {checked ? (
          <Ionicons name={icons.check} size={15} color={palette.white} />
        ) : null}
      </View>
      {label ? (
        <Text style={[styles.label, { color: t.text }]}>{label}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...typography.body,
    flexShrink: 1,
  },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
});
