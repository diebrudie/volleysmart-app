import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  size?: "small" | "large";
  fullScreen?: boolean;
};

export function Spinner({ size = "large", fullScreen = true }: Props) {
  const t = useTheme();

  if (!fullScreen) {
    return <ActivityIndicator size={size} color={t.primary} />;
  }

  return (
    <View style={[styles.center, { backgroundColor: t.background }]}>
      <ActivityIndicator size={size} color={t.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
