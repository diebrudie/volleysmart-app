import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Screen } from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTheme } from "@/hooks/useTheme";

export default function EventsScreen() {
  const { t } = useTranslation("events");
  const theme = useTheme();

  return (
    <Screen>
      <Text style={[styles.title, { color: theme.text }]}>
        {t("title", { defaultValue: "Events" })}
      </Text>
      <View style={styles.center}>
        <EmptyState
          title={t("empty.title", { defaultValue: "No events yet" })}
          subtitle={t("empty.subtitle", { defaultValue: "Events will appear here once your clubs create them" })}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "700", marginTop: 16 },
  center: { flex: 1, justifyContent: "center", paddingVertical: 80 },
});
