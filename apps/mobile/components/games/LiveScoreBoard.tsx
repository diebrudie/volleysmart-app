/**
 * The tap-to-score board for the Live Score screen (native parity for the
 * scoring area of apps/web/src/pages/LiveScore.tsx).
 *
 * Portrait layout with two LARGE tap zones side by side — the whole zone is the
 * button (big, thumb-friendly), NOT a small +1 chip. Each zone shows the team
 * label and a giant score readout; tapping the zone adds a point to that team.
 * A floating swap button between the zones flips which team is on the left
 * (visual left/right swap, like web). Team-A is red, Team-B is green (web
 * parity); the "left"/"right" side is decided by the parent via leftTeam.
 *
 * This component is presentational only: all score/undo/persistence/end-set
 * state lives in the screen. Team labels come from the screen (useGame bundle).
 */
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { palette, radii, spacing, typography } from "@/constants/theme";

type Side = "a" | "b";

type Props = {
  leftLabel: string;
  rightLabel: string;
  leftPoints: number;
  rightPoints: number;
  /** Which team is currently shown on each side (drives color, red=a green=b). */
  leftTeam: Side;
  rightTeam: Side;
  leftHasSetPoint: boolean;
  rightHasSetPoint: boolean;
  leftWon: boolean;
  rightWon: boolean;
  onTapLeft: () => void;
  onTapRight: () => void;
  onSwap: () => void;
  /** All sets complete — disable tapping, show a message. */
  disabled?: boolean;
};

function accentFor(side: Side): string {
  return side === "a" ? palette.red500 : palette.green400;
}

export function LiveScoreBoard({
  leftLabel,
  rightLabel,
  leftPoints,
  rightPoints,
  leftTeam,
  rightTeam,
  leftHasSetPoint,
  rightHasSetPoint,
  leftWon,
  rightWon,
  onTapLeft,
  onTapRight,
  onSwap,
  disabled = false,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation("games");

  // Adapt sizing to the current window (R6-5): the two tap zones stay side by
  // side (flex row) in both orientations, but in landscape the vertical space
  // per zone is much shorter, so shrink the giant score readout and trim the
  // vertical padding so the label + score + badge never overflow the zone.
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const scoreSize = isLandscape ? 64 : 96;
  const scoreLineHeight = isLandscape ? 70 : 104;
  const zonePaddingV = isLandscape ? spacing.md : spacing.xl;

  if (disabled) {
    return (
      <View style={styles.completeWrap}>
        <Text style={[styles.completeText, { color: theme.mutedForeground }]}>
          {t("liveScore.allSetsComplete", { defaultValue: "All sets complete" })}
        </Text>
      </View>
    );
  }

  const renderZone = (
    side: Side,
    label: string,
    points: number,
    hasSetPoint: boolean,
    won: boolean,
    onPress: () => void
  ) => {
    const accent = accentFor(side);
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t("liveScore.addPointFor", {
          defaultValue: "Add a point for {{team}}",
          team: label,
        })}
        style={({ pressed }) => [
          styles.zone,
          { paddingVertical: zonePaddingV },
          {
            backgroundColor: accent + (hasSetPoint || won ? "33" : "1A"),
            borderColor: hasSetPoint || won ? accent : "transparent",
          },
          pressed && { backgroundColor: accent + "40" },
        ]}
      >
        <Text style={[styles.zoneLabel, { color: accent }]} numberOfLines={1}>
          {label}
        </Text>
        <Text
          style={[
            styles.zoneScore,
            { color: accent, fontSize: scoreSize, lineHeight: scoreLineHeight },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {points}
        </Text>
        {hasSetPoint ? (
          <Text style={[styles.badge, { color: accent }]}>
            {t("liveScore.setPoint", { defaultValue: "SET POINT" })}
          </Text>
        ) : (
          <Text style={[styles.plusOne, { color: accent }]}>
            {t("liveScore.plusOne", { defaultValue: "+1" })}
          </Text>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.board}>
      {renderZone(leftTeam, leftLabel, leftPoints, leftHasSetPoint, leftWon, onTapLeft)}
      {renderZone(
        rightTeam,
        rightLabel,
        rightPoints,
        rightHasSetPoint,
        rightWon,
        onTapRight
      )}

      {/* Floating swap button between the two zones. */}
      <View pointerEvents="box-none" style={styles.swapOverlay}>
        <Pressable
          onPress={onSwap}
          accessibilityRole="button"
          accessibilityLabel={t("liveScore.swapSides", { defaultValue: "Swap sides" })}
          hitSlop={12}
          style={({ pressed }) => [
            styles.swapButton,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
            pressed && { backgroundColor: theme.muted },
          ]}
        >
          <Ionicons name="swap-horizontal" size={22} color={theme.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    flex: 1,
    flexDirection: "row",
    gap: spacing.md,
  },
  zone: {
    flex: 1,
    borderRadius: radii.xl,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  zoneLabel: {
    ...typography.h3,
    fontWeight: "700",
    maxWidth: "90%",
    textAlign: "center",
  },
  zoneScore: {
    fontSize: 96,
    fontWeight: "900",
    lineHeight: 104,
  },
  plusOne: {
    fontSize: 22,
    fontWeight: "800",
  },
  badge: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  swapOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  swapButton: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  completeWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  completeText: {
    ...typography.h3,
    fontWeight: "500",
  },
});
