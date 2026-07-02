import { View, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen } from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTheme } from "@/hooks/useTheme";

// Stub screen — a builder replaces the body with public event discovery (city-based).
export default function DiscoverEventsScreen() {
  const { t } = useTranslation("events");
  const theme = useTheme();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: t("discover.title", { defaultValue: "Discover Events" }),
          headerBackTitle: t("common:back", { defaultValue: "Back" }),
          headerTintColor: theme.primary,
          headerStyle: { backgroundColor: theme.background },
          headerTitleStyle: { color: theme.text },
        }}
      />
      <Screen scroll={false} safeTop={false}>
        <View style={styles.center}>
          <EmptyState
            title={t("discover.title", { defaultValue: "Discover Events" })}
            subtitle={t("common:comingSoon", {
              defaultValue: "This screen is coming soon.",
            })}
          />
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center" },
});
