import { View, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";

// Stub screen — a builder replaces the body with the FAQ list (Supabase `faqs` table).
export default function FaqScreen() {
  const { t } = useTranslation("common");

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={t("faq.title", { defaultValue: "FAQ" })} />
      <Screen scroll={false} safeTop={false}>
        <View style={styles.center}>
          <EmptyState
            title={t("faq.title", { defaultValue: "FAQ" })}
            subtitle={t("comingSoon", {
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
