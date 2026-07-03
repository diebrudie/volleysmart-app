import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { Chip } from "@/components/ui/Chip";
import { radii, spacing, typography } from "@/constants/theme";

export type Position = {
  id: string;
  name: string;
};

type Props = {
  primaryPositionId: string | null;
  secondaryPositionId: string | null;
  onChange: (
    primaryId: string | null,
    secondaryId: string | null
  ) => void;
  /** Fetched by the caller (core getAllPositions). */
  positions: Position[];
};

/**
 * Primary + secondary volleyball position picker.
 *
 * Shared contract: also used by the onboarding wizard. Standalone — all
 * data comes in via props. Rules: secondary is optional and can never
 * equal the primary; picking a primary that is the current secondary
 * clears the secondary.
 */
export function PositionSelector({
  primaryPositionId,
  secondaryPositionId,
  onChange,
  positions,
}: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation("profile");

  const positionLabel = (name: string) =>
    tr(`positions.name.${name}`, { defaultValue: name });

  const handlePrimaryPress = (positionId: string) => {
    const nextPrimary = positionId;
    const nextSecondary =
      secondaryPositionId === positionId ? null : secondaryPositionId;
    onChange(nextPrimary, nextSecondary);
  };

  const handleSecondaryPress = (positionId: string) => {
    if (positionId === primaryPositionId) return;
    onChange(
      primaryPositionId,
      secondaryPositionId === positionId ? null : positionId
    );
  };

  return (
    <View style={styles.root}>
      <View>
        <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>
          {tr("edit.mainPosition", { defaultValue: "Main Position" })}
        </Text>
        <View style={styles.cardGrid}>
          {positions.map((position) => {
            const selected = position.id === primaryPositionId;
            return (
              <Pressable
                key={position.id}
                onPress={() => handlePrimaryPress(position.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.positionCard,
                  {
                    borderColor: selected ? t.primary : t.cardBorder,
                    backgroundColor: selected
                      ? t.muted
                      : pressed
                      ? t.surface
                      : t.card,
                  },
                ]}
              >
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: selected ? t.primary : t.mutedForeground,
                    },
                  ]}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.positionCardLabel,
                    { color: selected ? t.primary : t.text },
                    selected && styles.positionCardLabelSelected,
                  ]}
                >
                  {positionLabel(position.name)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>
          {tr("edit.secondaryPositions", {
            defaultValue: "Secondary Positions",
          })}
        </Text>
        <View style={styles.chipRow}>
          {positions
            .filter((position) => position.id !== primaryPositionId)
            .map((position) => (
              <Chip
                key={position.id}
                label={positionLabel(position.name)}
                selected={position.id === secondaryPositionId}
                onPress={() => handleSecondaryPress(position.id)}
              />
            ))}
        </View>
        <Text style={[styles.hint, { color: t.textSecondary }]}>
          {tr("edit.secondaryHint", {
            defaultValue: "Tap to toggle secondary positions",
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  sectionLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  positionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexGrow: 1,
    flexBasis: "45%",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
  },
  positionCardLabel: {
    ...typography.body,
    flexShrink: 1,
  },
  positionCardLabelSelected: {
    fontWeight: "600",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  hint: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
});
