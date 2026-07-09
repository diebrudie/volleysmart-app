import { useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { useTheme } from "@/hooks/useTheme";
import {
  buildInviteLink,
  useClubInvitation,
  useRegenerateInvitation,
} from "@/hooks/useInvite";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";

type Props = {
  /** Pass undefined to defer fetching (e.g. while a sheet is closed). */
  clubId: string | undefined;
};

/**
 * Invite-link panel: link box + copy, regenerate, native share.
 * Mirrors web ClubInviteSharePanel. Used by both the /clubs/[id]/invite
 * screen and the InviteSheet bottom drawer on the club overview.
 */
export function InviteSharePanel({ clubId }: Props) {
  const { t } = useTranslation("clubs");
  const theme = useTheme();

  const { data: invitation, isLoading, isError } = useClubInvitation(clubId);
  const regenerateMut = useRegenerateInvitation(clubId);
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

  return (
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
          <Text style={[styles.linkLabel, { color: theme.textSecondary }]}>
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
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
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
                style={[styles.regenerateText, { color: theme.textSecondary }]}
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
  );
}

const styles = StyleSheet.create({
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
});
