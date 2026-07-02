import { View, StyleSheet } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen } from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTheme } from "@/hooks/useTheme";

// Stub screen — a Wave-2 builder replaces the body with the invite-link flow.
export default function InviteMembersScreen() {
  useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation("clubs");
  const theme = useTheme();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: t("invite.title", { defaultValue: "Invite Members" }),
          headerBackTitle: t("common:back", { defaultValue: "Back" }),
          headerTintColor: theme.primary,
          headerStyle: { backgroundColor: theme.background },
          headerTitleStyle: { color: theme.text },
        }}
      />
      <Screen scroll={false} safeTop={false}>
        <View style={styles.center}>
          <EmptyState
            title={t("invite.title", { defaultValue: "Invite Members" })}
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
