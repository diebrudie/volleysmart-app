import { useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { useTheme } from "@/hooks/useTheme";
import { useUserClubs } from "@/hooks/useUserClubs";
import {
  buildInviteLink,
  useClubInvitation,
  useRegenerateInvitation,
} from "@/hooks/useInvite";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";

export default function InviteMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation("clubs");
  const theme = useTheme();
  const router = useRouter();

  const { data: clubs } = useUserClubs();
  const clubName = clubs?.find((c) => c.club_id === id)?.clubs?.name;

  const {
    data: invitation,
    isLoading,
    isError,
  } = useClubInvitation(id);
  const regenerateMut = useRegenerateInvitation(id);
  const [copied, setCopied] = useState(false);

  const inviteLink = invitation ? buildInviteLink(invitation.token) : "";

  const inviteMessage = [
    t("invite.shareMessage", {
      defaultValue: "Hey, let's play Volleyball Smartly together.",
    }),
    " ",
    t("invite.shareMessageCta", {
      defaultValue: "Register for free and join my Club with this link:",
    }),
    inviteLink,
  ].join("\n");

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await Clipboard.setStringAsync(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast(t("invite.copied", { defaultValue: "Invite link copied" }));
    } catch {
      toast(
        t("invite.copyFailed", {
          defaultValue: "Copy failed. Please copy the link manually.",
        }),
        "error"
      );
    }
  };

  const handleShare = async () => {
    if (!inviteLink) return;
    try {
      await Share.share({ message: inviteMessage, url: inviteLink });
    } catch {
      // Native share unavailable (e.g. Expo web without navigator.share) →
      // fall back to copying the link.
      await handleCopy();
    }
  };

  const handleRegenerate = () => {
    if (!invitation || regenerateMut.isPending) return;
    regenerateMut.mutate(invitation.invitation_id, {
      onSuccess: () =>
        toast(
          t("invite.regenerated", {
            defaultValue: "Link regenerated. The old link has been revoked.",
          })
        ),
      onError: () =>
        toast(
          t("invite.regenerateFailed", {
            defaultValue: "Failed to regenerate link.",
          }),
          "error"
        ),
    });
  };

  const handleGoToClub = () => {
    router.replace(`/clubs/${id}`);
  };

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
      <Screen safeTop={false}>
        {/* Icon + heading (web InviteMembers.tsx) */}
        <View style={styles.hero}>
          <View
            style={[
              styles.heroIcon,
              { backgroundColor: theme.primary + "1A" },
            ]}
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
        <View
          style={[
            styles.panel,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
          ]}
        >
          {isLoading ? (
            <View style={styles.panelCenter}>
              <Spinner />
            </View>
          ) : isError || !invitation ? (
            <Text style={[styles.panelError, { color: theme.destructive }]}>
              {t("invite.loadError", {
                defaultValue:
                  "Couldn't load invite link. Please go back and try again.",
              })}
            </Text>
          ) : (
            <>
              <Text
                style={[styles.linkLabel, { color: theme.textSecondary }]}
              >
                {t("invite.linkLabel", { defaultValue: "Invite link" })}
              </Text>
              <View style={styles.linkRow}>
                <View
                  style={[
                    styles.linkBox,
                    {
                      backgroundColor: theme.muted,
                      borderColor: theme.cardBorder,
                    },
                  ]}
                >
                  <Text
                    style={[styles.linkText, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {inviteLink}
                  </Text>
                </View>
                <Pressable
                  onPress={handleCopy}
                  accessibilityRole="button"
                  accessibilityLabel={t("invite.copy", {
                    defaultValue: "Copy invite link",
                  })}
                  style={({ pressed }) => [
                    styles.copyButton,
                    { borderColor: theme.cardBorder },
                    pressed && { backgroundColor: theme.surface },
                  ]}
                >
                  <Ionicons
                    name={copied ? icons.check : icons.copy}
                    size={18}
                    color={copied ? theme.success : theme.text}
                  />
                </Pressable>
              </View>

              <View style={styles.hintRow}>
                <Text
                  style={[styles.hint, { color: theme.textSecondary }]}
                >
                  {t("invite.linkHint", {
                    defaultValue:
                      "Anyone with this link can request to join. Admins must approve.",
                  })}
                </Text>
                <Pressable
                  onPress={handleRegenerate}
                  disabled={regenerateMut.isPending}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.regenerate,
                    (pressed || regenerateMut.isPending) && { opacity: 0.6 },
                  ]}
                >
                  <Ionicons
                    name={icons.refreshCw}
                    size={12}
                    color={theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.regenerateText,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {t("invite.newLink", { defaultValue: "New link" })}
                  </Text>
                </Pressable>
              </View>

              <Button
                title={t("invite.shareVia", { defaultValue: "Share link" })}
                variant="secondary"
                onPress={handleShare}
                style={styles.shareButton}
              />
            </>
          )}
        </View>

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
  panel: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.xl,
  },
  panelCenter: { alignItems: "center", paddingVertical: spacing.xxl },
  panelError: { ...typography.bodySm, textAlign: "center" },
  linkLabel: { ...typography.label, marginBottom: spacing.sm },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  linkBox: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  linkText: { ...typography.bodySm },
  copyButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  hint: { ...typography.caption, flex: 1 },
  regenerate: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  regenerateText: { ...typography.caption },
  shareButton: { marginTop: spacing.lg },
  footer: { marginTop: spacing.xxl, gap: spacing.md },
});
