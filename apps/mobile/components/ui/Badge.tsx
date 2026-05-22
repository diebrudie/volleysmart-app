import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { useTheme } from "@/hooks/useTheme";

type Variant = "default" | "success" | "danger" | "warning";

type Props = {
  label: string;
  variant?: Variant;
  style?: ViewStyle;
};

export function Badge({ label, variant = "default", style }: Props) {
  const t = useTheme();

  const bgMap: Record<Variant, string> = {
    default: t.surface,
    success: "#dcfce7",
    danger: "#fee2e2",
    warning: "#fef3c7",
  };

  const textMap: Record<Variant, string> = {
    default: t.textSecondary,
    success: "#166534",
    danger: "#991b1b",
    warning: "#92400e",
  };

  return (
    <View style={[styles.badge, { backgroundColor: bgMap[variant] }, style]}>
      <Text style={[styles.text, { color: textMap[variant] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    alignSelf: "flex-start",
  },
  text: { fontSize: 12, fontWeight: "600" },
});
