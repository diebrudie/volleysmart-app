import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";

type Variant = "primary" | "secondary" | "outline" | "danger" | "ghost";

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
}: Props) {
  const t = useTheme();
  const isDisabled = disabled || loading;

  const bg: Record<Variant, ViewStyle> = {
    primary: { backgroundColor: t.primary },
    secondary: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
    outline: { backgroundColor: "transparent", borderWidth: 1, borderColor: t.border },
    danger: { backgroundColor: t.danger },
    ghost: { backgroundColor: "transparent" },
  };

  const pressed: Record<Variant, ViewStyle> = {
    primary: { backgroundColor: t.primaryPressed },
    secondary: { backgroundColor: t.border },
    outline: { backgroundColor: t.surface },
    danger: { backgroundColor: t.dangerPressed },
    ghost: { backgroundColor: t.surface },
  };

  const textColor: Record<Variant, string> = {
    primary: "#fff",
    secondary: t.text,
    outline: t.text,
    danger: "#fff",
    ghost: t.primary,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed: p }) => [
        styles.base,
        bg[variant],
        p && !isDisabled && pressed[variant],
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor[variant]} size="small" />
      ) : (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={[styles.text, { color: textColor[variant] } as TextStyle]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.5,
  },
});
