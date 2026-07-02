import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Screen } from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/EmptyState";

export default function MembersScreen() {
  const { t } = useTranslation("members");

  return (
    <Screen safeTop={false}>
      <View style={styles.center}>
        <EmptyState
          title={t("title", { defaultValue: "Members" })}
          subtitle={t("comingSoon", {
            defaultValue: "Global members view coming soon",
          })}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", paddingVertical: 80 },
});
