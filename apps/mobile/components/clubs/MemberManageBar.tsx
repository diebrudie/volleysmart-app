import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/Button";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";

type Props = {
  /** Number of currently selected members. Bar renders nothing at 0. */
  selectedCount: number;
  /** Opens the remove-confirmation dialog. */
  onRemove: () => void;
  /** Disables the remove button while a removal is in flight. */
  removing?: boolean;
};

/**
 * Action bar shown under the members list while admin manage mode is
 * active and at least one member is selected. Mirrors the web
 * ClubOverview "Remove N members" destructive button.
 */
export function MemberManageBar({
  selectedCount,
  onRemove,
  removing = false,
}: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation("clubs");

  if (selectedCount <= 0) return null;

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: t.danger + "14", borderColor: t.danger + "33" },
      ]}
    >
      <View style={styles.labelRow}>
        <Ionicons name={icons.trash2} size={16} color={t.danger} />
        <Text style={[styles.label, { color: t.text }]}>
          {tr("overview.membersSection.selectedCount", {
            defaultValue: "{{count}} selected",
            count: selectedCount,
          })}
        </Text>
      </View>
      <Button
        title={tr("overview.membersSection.removeCount", {
          defaultValue: "Remove {{count}} members",
          count: selectedCount,
        })}
        variant="danger"
        loading={removing}
        onPress={onRemove}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  label: { ...typography.bodySm, fontWeight: "500" },
});
