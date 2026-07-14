import { StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { InviteSharePanel } from "@/components/clubs/InviteSharePanel";
import { useTheme } from "@/hooks/useTheme";
import { useUserClubs } from "@/hooks/useUserClubs";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";

/**
 * Invite-members screen. Kept for deep links; the club overview opens the
 * same panel as a bottom drawer (InviteSheet). Uses ScreenHeader (plain
 * arrow back with canGoBack fallback) instead of the native stack header.
 */
export default function InviteMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation("clubs");
  const theme = useTheme();
  const router = useRouter();

  const { data: clubs } = useUserClubs();
  const clubName = clubs?.find((c) => c.club_id === id)?.clubs?.name;

  const handleGoToClub = () => {
    router.replace(`/clubs/${id}`);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={t("invite.title", { defaultValue: "Invite Members" })}
      />
      <Screen safeTop={false}>
        {/* Icon + heading (web InviteMembers.tsx) */}
        <View style={styles.hero}>
          <View
            style={[styles.heroIcon, { backgroundColor: theme.primary + "1A" }]}
          >
            <Ionicons name={icons.users} size={32} color={theme.primary} />
          </View>
          <Text style={[styles.heading, { color: theme.text }]}>
            {t("invite.heading", { defaultValue: "Invite your teammates" })}
          </Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {clubName
              ? t("invite.descriptionWithName", {
                  name: clubName,
                  defaultValue:
                    "Share the invite link so others can join {{name}}.",
                })
              : t("invite.descriptionGeneric", {
                  defaultValue:
                    "Share the invite link so others can join your club.",
                })}
          </Text>
        </View>

        {/* Share panel (web ClubInviteSharePanel) */}
        <InviteSharePanel clubId={id} />

        {/* Footer buttons (web InviteMembers.tsx) */}
        <View style={styles.footer}>
          <Button
            title={t("invite.goToClub", { defaultValue: "Go to Club" })}
            onPress={handleGoToClub}
          />
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  heading: {
    ...typography.h1,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    textAlign: "center",
  },
  footer: { marginTop: spacing.xxl, gap: spacing.md },
});
