import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Screen } from "@/components/ui/Screen";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";

export default function HomeScreen() {
  const { t } = useTranslation("home");
  const theme = useTheme();
  const { user } = useAuth();

  const firstName = user?.user_metadata?.first_name ?? "";

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: theme.textSecondary }]}>
          {t("greeting", { defaultValue: "Welcome back" })}
        </Text>
        <Text style={[styles.name, { color: theme.text }]}>
          {firstName || "Player"}
        </Text>
      </View>

      <View style={styles.placeholder}>
        <Text style={{ color: theme.textSecondary, textAlign: "center" }}>
          {t("dashboard.comingSoon", { defaultValue: "Dashboard coming in Phase 2" })}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 16, marginBottom: 24 },
  greeting: { fontSize: 15 },
  name: { fontSize: 28, fontWeight: "700", marginTop: 4 },
  placeholder: { flex: 1, justifyContent: "center", paddingVertical: 80 },
});
