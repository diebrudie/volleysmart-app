/**
 * MonthStatsCard — games / win rate / hours for the current month.
 * Port of the "This Month" card in apps/web/src/pages/HomeDashboard.tsx.
 * With placeholder=true it renders the onboarding "Your Stats" teaser
 * ("--" values) for new users.
 */
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { type MonthStats } from "@/hooks/useHomeDashboard";
import { icons, type IoniconsName } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";

type Props = {
  stats: MonthStats | undefined;
  /** Onboarding teaser mode: "--" values + play-to-unlock copy. */
  placeholder?: boolean;
  onPress?: () => void;
};

export function MonthStatsCard({ stats, placeholder, onPress }: Props) {
  const theme = useTheme();
  const { t } = useTranslation("events");

  const columns: {
    icon: IoniconsName;
    iconColor: string;
    value: string;
    label: string;
  }[] = [
    {
      icon: icons.volleyball,
      iconColor: theme.primary,
      value: placeholder ? "--" : String(stats?.gamesPlayed ?? 0),
      label: t("home.games", { defaultValue: "Games" }),
    },
    {
      icon: icons.trendingUp,
      iconColor: theme.success,
      value: placeholder ? "--" : `${stats?.winRate ?? 0}%`,
      label: t("home.winRate", { defaultValue: "Win Rate" }),
    },
    {
      icon: icons.clock,
      iconColor: theme.accent,
      value: placeholder ? "--" : String(stats?.hoursPlayed ?? 0),
      label: t("home.hours", { defaultValue: "Hours" }),
    },
  ];

  const valueColor = placeholder ? theme.textSecondary : theme.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.cardBorder },
        pressed && !!onPress && { opacity: 0.8 },
      ]}
    >
      <View style={styles.headerRow}>
        <Ionicons name={icons.trendingUp} size={18} color={theme.primary} />
        <Text style={[styles.headerLabel, { color: theme.textSecondary }]}>
          {placeholder
            ? t("home.onboarding.yourStats", { defaultValue: "Your Stats" })
            : t("home.thisMonth", { defaultValue: "This Month" })}
        </Text>
      </View>

      {placeholder ? (
        <Text style={[styles.teaser, { color: theme.textSecondary }]}>
          {t("home.onboarding.playToUnlock", {
            defaultValue: "Play your first game to unlock your analytics",
          })}
        </Text>
      ) : null}

      <View style={styles.grid}>
        {columns.map((col) => (
          <View key={col.label} style={styles.column}>
            <Ionicons name={col.icon} size={16} color={col.iconColor} />
            <Text style={[styles.value, { color: valueColor }]}>
              {col.value}
            </Text>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {col.label}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.xl,
    minHeight: 196,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerLabel: {
    ...typography.label,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  teaser: { ...typography.bodySm, marginBottom: spacing.sm },
  grid: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  column: { flex: 1, alignItems: "center", gap: spacing.xs },
  value: { fontSize: 28, fontWeight: "700", lineHeight: 32 },
  label: { ...typography.caption },
});
