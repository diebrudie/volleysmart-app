import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { useClubStats } from "@/hooks/useClubStats";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { icons, type IoniconsName } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";

type Props = {
  clubId: string;
};

/**
 * Stats tab of the club overview. Mirrors the web ClubOverview stats
 * TabsContent: year selector, 4 stat tiles (games / hours / attendance /
 * cancelled) and the "Best Team Combinations" horizontal carousel.
 */
export function ClubStatsTab({ clubId }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation("clubs");
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data: stats, isLoading } = useClubStats(clubId, year);

  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i).map(
    (y) => ({ label: String(y), value: y })
  );

  const hasData =
    !!stats && (stats.totalEncounters > 0 || stats.cancelledEvents > 0);

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: t.text }]}>
          {tr("overview.statsSection.title", { defaultValue: "Stats" })}
        </Text>
        <View style={styles.yearSelect}>
          <Select
            value={year}
            onChange={setYear}
            options={yearOptions}
            sheetTitle={tr("overview.statsSection.yearSheetTitle", {
              defaultValue: "Season",
            })}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.grid}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.tileWrap}>
              <Skeleton height={84} radius={radii.lg} />
            </View>
          ))}
        </View>
      ) : hasData ? (
        <View style={styles.stack}>
          <View style={styles.grid}>
            <StatTile
              icon={icons.medal}
              iconColor={t.primary}
              value={String(stats.totalEncounters)}
              label={tr("overview.statsSection.games", {
                defaultValue: "Games",
              })}
            />
            <StatTile
              icon={icons.clock}
              iconColor={t.accent}
              value={String(stats.totalHours)}
              label={tr("overview.statsSection.hours", {
                defaultValue: "Hours",
              })}
            />
            <StatTile
              icon={icons.users}
              iconColor={t.success}
              value={`${stats.attendanceRate}%`}
              label={tr("overview.statsSection.attendance", {
                defaultValue: "Attendance",
              })}
            />
            <StatTile
              icon={icons.xCircle}
              iconColor={t.danger}
              value={String(stats.cancelledEvents)}
              label={tr("overview.statsSection.cancelled", {
                defaultValue: "Cancelled",
              })}
            />
          </View>

          {stats.topCombinations.length > 0 ? (
            <View
              style={[
                styles.combosCard,
                { backgroundColor: t.card, borderColor: t.cardBorder },
              ]}
            >
              <View style={styles.combosHeader}>
                <Ionicons name={icons.trophy} size={16} color={t.warning} />
                <Text style={[styles.combosTitle, { color: t.text }]}>
                  {tr("overview.statsSection.bestCombinations", {
                    defaultValue: "Best Team Combinations",
                  })}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.combosScroll}
              >
                {stats.topCombinations.map((combo, i) => (
                  <View
                    key={i}
                    style={[
                      styles.comboCard,
                      { backgroundColor: t.muted, borderColor: t.cardBorder },
                    ]}
                  >
                    <View style={styles.comboTopRow}>
                      <Text
                        style={[
                          styles.comboRecord,
                          { color: t.mutedForeground },
                        ]}
                      >
                        {tr("overview.statsSection.comboRecord", {
                          defaultValue:
                            "{{wins}}W / {{gamesPlayed}} games · {{winRate}}% win rate",
                          wins: combo.wins,
                          gamesPlayed: combo.gamesPlayed,
                          winRate: combo.winRate,
                        })}
                      </Text>
                      {i === 0 ? <Text style={styles.crown}>🏆</Text> : null}
                    </View>
                    <View style={styles.comboPlayers}>
                      {combo.players.map((p, j) => (
                        <View key={j} style={styles.comboPlayerRow}>
                          <Text
                            numberOfLines={1}
                            style={[styles.comboPlayerName, { color: t.text }]}
                          >
                            {p.name}
                          </Text>
                          {p.position ? (
                            <View
                              style={[
                                styles.positionPill,
                                { backgroundColor: t.background },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.positionPillText,
                                  { color: t.mutedForeground },
                                ]}
                              >
                                {tr(`profile:positions.name.${p.position}`, {
                                  defaultValue: p.position,
                                })}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      ) : (
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: t.card, borderColor: t.cardBorder },
          ]}
        >
          <Ionicons
            name={icons.barChart}
            size={32}
            color={t.mutedForeground}
          />
          <Text style={[styles.emptyText, { color: t.textSecondary }]}>
            {tr("overview.statsSection.noGames", {
              defaultValue: "No games played in {{year}}",
              year,
            })}
          </Text>
        </View>
      )}
    </View>
  );
}

function StatTile({
  icon,
  iconColor,
  value,
  label,
}: {
  icon: IoniconsName;
  iconColor: string;
  value: string;
  label: string;
}) {
  const t = useTheme();
  return (
    <View style={styles.tileWrap}>
      <View
        style={[
          styles.tile,
          { backgroundColor: t.card, borderColor: t.cardBorder },
        ]}
      >
        <Ionicons name={icon} size={16} color={iconColor} />
        <Text style={[styles.tileValue, { color: t.text }]}>{value}</Text>
        <Text style={[styles.tileLabel, { color: t.mutedForeground }]}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  sectionTitle: { ...typography.h3, flex: 1 },
  yearSelect: { width: 110 },
  stack: { gap: spacing.md },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tileWrap: {
    flexBasis: "48%",
    flexGrow: 1,
  },
  tile: {
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    gap: 2,
  },
  tileValue: { fontSize: 20, fontWeight: "700" },
  tileLabel: { fontSize: 10 },
  combosCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  combosHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  combosTitle: { ...typography.bodySm, fontWeight: "600" },
  combosScroll: { gap: spacing.md, paddingRight: spacing.sm },
  comboCard: {
    width: 220,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  comboTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  comboRecord: { fontSize: 10, flex: 1 },
  crown: { fontSize: 14 },
  comboPlayers: { gap: 6 },
  comboPlayerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  comboPlayerName: { ...typography.bodySm, fontWeight: "500", flexShrink: 1 },
  positionPill: {
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  positionPillText: { fontSize: 10 },
  emptyCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyText: { ...typography.bodySm, textAlign: "center" },
});
