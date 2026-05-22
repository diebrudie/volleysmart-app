import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
};

export function EmptyState({ title, subtitle, icon }: Props) {
  const t = useTheme();
  return (
    <View style={styles.container}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={[styles.title, { color: t.text }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: t.textSecondary }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center", padding: 32, gap: 8 },
  icon: { marginBottom: 8 },
  title: { fontSize: 17, fontWeight: "600", textAlign: "center" },
  subtitle: { fontSize: 15, textAlign: "center", lineHeight: 22 },
});
