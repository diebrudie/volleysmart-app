import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Sheet } from "@/components/ui/Sheet";
import { InviteSharePanel } from "@/components/clubs/InviteSharePanel";
import { useTheme } from "@/hooks/useTheme";
import { spacing, typography } from "@/constants/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  clubId: string | undefined;
  clubName?: string | null;
};

/**
 * "Invite member" bottom drawer opened from the club overview action row.
 * Mirrors the web ClubOverview invite sheet (ClubInviteSharePanel inside a
 * bottom Sheet). The /clubs/[id]/invite route stays available for deep links.
 */
export function InviteSheet({ visible, onClose, clubId, clubName }: Props) {
  const { t } = useTranslation("clubs");
  const theme = useTheme();

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t("invite.title", { defaultValue: "Invite Members" })}
    >
      <View style={styles.body}>
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
        {/* Defer the invite query until the sheet is opened. */}
        <InviteSharePanel clubId={visible ? clubId : undefined} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  description: {
    ...typography.bodySm,
    textAlign: "center",
    paddingHorizontal: spacing.md,
  },
});
