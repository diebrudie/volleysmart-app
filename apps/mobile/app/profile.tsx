import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { KeyboardAwareScreen } from "@/components/ui/KeyboardAwareScreen";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Spinner } from "@/components/ui/Spinner";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { MyClubsTab } from "@/components/profile/MyClubsTab";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { usePlayerStats } from "@/hooks/usePlayerStats";
import { queryKeys } from "@/constants/queryKeys";
import { icons, type IoniconsName } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";

type TabKey = "analytics" | "positions" | "clubs";

export default function ProfileScreen() {
  const { t, i18n } = useTranslation("profile");
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: player, isLoading: playerLoading } = usePlayerProfile();
  const { data: playerStats, isLoading: statsLoading } = usePlayerStats();

  const [activeTab, setActiveTab] = useState<TabKey>("analytics");
  const [isEditing, setIsEditing] = useState(false);

  const firstName = player?.first_name ?? user?.user_metadata?.first_name ?? "";
  const lastName = player?.last_name ?? user?.user_metadata?.last_name ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Player";

  const primaryPosition = player?.player_positions?.find(
    (pp: any) => pp.is_primary
  );
  const secondaryPositions =
    player?.player_positions?.filter((pp: any) => !pp.is_primary) ?? [];

  const positionLabel = (name: string | undefined) =>
    name ? t(`positions.name.${name}`, { defaultValue: name }) : "";

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.player(user?.id),
      }),
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.clubs(user?.id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.allStats }),
    ]);
  };

  const formatBirthday = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(i18n.language, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const genderLabel = (gender: string) =>
    t(`edit.gender${gender.charAt(0).toUpperCase()}${gender.slice(1)}`, {
      defaultValue: gender,
    });

  const screenOptions = (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={t("pageTitle", { defaultValue: "Profile" })} />
    </>
  );

  if (playerLoading) {
    return (
      <>
        {screenOptions}
        <Screen scroll={false} safeTop={false}>
          <View style={styles.loading}>
            <Spinner />
          </View>
        </Screen>
      </>
    );
  }

  // ── Edit mode ─────────────────────────────────────────────────────────
  if (isEditing && player && user) {
    return (
      <>
        {screenOptions}
        <KeyboardAwareScreen safeTop={false}>
          <Text style={[styles.editTitle, { color: theme.text }]}>
            {t("edit.title", { defaultValue: "Edit Profile" })}
          </Text>
          <Text style={[styles.editDescription, { color: theme.textSecondary }]}>
            {t("edit.description", {
              defaultValue: "Update your personal information and positions.",
            })}
          </Text>
          <ProfileEditForm
            player={player}
            userId={user.id}
            onSaved={() => setIsEditing(false)}
            onCancel={() => setIsEditing(false)}
          />
        </KeyboardAwareScreen>
      </>
    );
  }

  // ── Positions tab content (mirrors the web Positions tab) ─────────────
  const positionsContent =
    primaryPosition || secondaryPositions.length > 0 ? (
      <Card>
        {primaryPosition ? (
          <View style={styles.positionBlock}>
            <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>
              {t("positions.mainPosition", { defaultValue: "Main Position" })}
            </Text>
            <View
              style={[
                styles.primaryPill,
                { borderColor: theme.primary, backgroundColor: theme.muted },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: theme.primary }]} />
              <Text style={[styles.primaryPillText, { color: theme.primary }]}>
                {positionLabel(primaryPosition.positions?.name)}
              </Text>
            </View>
          </View>
        ) : null}
        {secondaryPositions.length > 0 ? (
          <View style={styles.positionBlock}>
            <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>
              {t("positions.secondaryPositions", {
                defaultValue: "Secondary Positions",
              })}
            </Text>
            <View style={styles.chipRow}>
              {secondaryPositions.map((pp: any) => (
                <Chip key={pp.id} label={positionLabel(pp.positions?.name)} />
              ))}
            </View>
          </View>
        ) : null}
      </Card>
    ) : (
      <Card>
        <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>
          {t("positions.mainPosition", { defaultValue: "Main Position" })}
        </Text>
        <Text style={[typography.body, { color: theme.textSecondary }]}>
          {t("positions.noPositions", { defaultValue: "No positions set yet." })}
        </Text>
      </Card>
    );

  // ── Analytics tab content (mirrors the web Analytics tab) ─────────────
  const analyticsContent = (
    <Card>
      <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>
        {t("analytics.allTime", { defaultValue: "All time" })}
      </Text>
      {statsLoading ? (
        <View style={styles.statsLoading}>
          <Spinner />
        </View>
      ) : playerStats && playerStats.gamesPlayed > 0 ? (
        <>
          <View style={styles.statsGrid}>
            <StatTile
              icon={icons.swords}
              iconColor={theme.primary}
              value={String(playerStats.gamesPlayed)}
              label={t("analytics.gamesPlayed", {
                defaultValue: "Games Played",
              })}
            />
            <StatTile
              icon={icons.trendingUp}
              iconColor={theme.success}
              value={`${playerStats.winRate}%`}
              label={t("analytics.setWinRate", {
                defaultValue: "Set Win Rate",
              })}
            />
            <StatTile
              icon={icons.trophy}
              iconColor={theme.warning}
              value={playerStats.matchDaysWon}
              valueSuffix={`/${
                playerStats.matchDaysWon +
                playerStats.matchDaysLost +
                playerStats.matchDaysTied
              }`}
              label={t("analytics.gamesWon", { defaultValue: "Games Won" })}
            />
            <StatTile
              icon={icons.clock}
              iconColor={theme.accent}
              value={String(playerStats.totalHours)}
              label={t("analytics.hoursPlayed", {
                defaultValue: "Hours Played",
              })}
            />
          </View>

          {/* Set record W/L bar */}
          {playerStats.setsWon + playerStats.setsLost + playerStats.setsTied >
          0 ? (
            <View style={styles.setRecordBlock}>
              <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>
                {t("analytics.setRecord", { defaultValue: "Set Record" })}
              </Text>
              <View style={styles.setRecordLabels}>
                <Text style={[styles.setRecordText, { color: theme.success }]}>
                  {playerStats.setsWon}W
                </Text>
                <Text
                  style={[styles.setRecordText, { color: theme.destructive }]}
                >
                  {playerStats.setsLost}L
                </Text>
                {playerStats.setsTied > 0 ? (
                  <Text
                    style={[
                      styles.setRecordText,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {playerStats.setsTied}T
                  </Text>
                ) : null}
              </View>
              <View
                style={[styles.setRecordTrack, { backgroundColor: theme.muted }]}
              >
                <View
                  style={{
                    flex: playerStats.setsWon,
                    backgroundColor: theme.success,
                  }}
                />
                <View
                  style={{
                    flex: playerStats.setsLost,
                    backgroundColor: theme.destructive,
                  }}
                />
                {playerStats.setsTied > 0 ? (
                  <View style={{ flex: playerStats.setsTied }} />
                ) : null}
              </View>
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.statsEmpty}>
          <Ionicons
            name={icons.swords}
            size={28}
            color={theme.mutedForeground}
          />
          <Text style={[styles.statsEmptyText, { color: theme.textSecondary }]}>
            {t("analytics.noGames", { defaultValue: "No games played yet" })}
          </Text>
          <Text style={[styles.statsEmptyHint, { color: theme.textSecondary }]}>
            {t("analytics.noGamesHint", {
              defaultValue: "Stats will appear after your first game",
            })}
          </Text>
        </View>
      )}
    </Card>
  );

  // ── View mode ─────────────────────────────────────────────────────────
  return (
    <>
      {screenOptions}
      <Screen onRefresh={handleRefresh} safeTop={false}>
        {/* Avatar + name + city */}
        <View style={styles.header}>
          <Avatar uri={player?.image_url} name={fullName} size={80} />
          <View style={styles.headerText}>
            <View style={styles.nameRow}>
              <Text
                numberOfLines={1}
                style={[styles.name, { color: theme.text }]}
              >
                {fullName}
              </Text>
              <Pressable
                onPress={() => setIsEditing(true)}
                accessibilityRole="button"
                accessibilityLabel={t("edit.title", {
                  defaultValue: "Edit Profile",
                })}
                style={({ pressed }) => [
                  styles.editButton,
                  {
                    borderColor: theme.cardBorder,
                    backgroundColor: pressed ? theme.muted : "transparent",
                  },
                ]}
              >
                <Ionicons
                  name={icons.pencil}
                  size={14}
                  color={theme.textSecondary}
                />
              </Pressable>
            </View>
            {player?.city ? (
              <Text style={[styles.subline, { color: theme.textSecondary }]}>
                {player.city}
                {player.country ? `, ${player.country}` : ""}
              </Text>
            ) : null}
            <Text style={[styles.subline, { color: theme.textSecondary }]}>
              {user?.email}
            </Text>
          </View>
        </View>

        {/* Birthday / Height / Gender row */}
        <View style={[styles.infoRow, { borderBottomColor: theme.cardBorder }]}>
          <View style={styles.infoItem}>
            <View style={styles.infoLabelRow}>
              <Ionicons
                name={icons.calendarDays}
                size={13}
                color={theme.primary}
              />
              <Text style={[styles.infoLabel, { color: theme.primary }]}>
                {t("header.birthday", { defaultValue: "Birthday" })}
              </Text>
            </View>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {player?.birthday ? formatBirthday(player.birthday) : "—"}
            </Text>
          </View>
          <View style={[styles.infoItem, styles.infoItemCenter]}>
            <View style={styles.infoLabelRow}>
              <Ionicons name={icons.barChart} size={13} color={theme.primary} />
              <Text style={[styles.infoLabel, { color: theme.primary }]}>
                {t("header.height", { defaultValue: "Height" })}
              </Text>
            </View>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {player?.height_cm
                ? t("header.heightValue", {
                    defaultValue: "{{value}} cm",
                    value: player.height_cm,
                  })
                : "—"}
            </Text>
          </View>
          <View style={[styles.infoItem, styles.infoItemEnd]}>
            <View style={styles.infoLabelRow}>
              <Ionicons name={icons.user} size={13} color={theme.primary} />
              <Text style={[styles.infoLabel, { color: theme.primary }]}>
                {t("header.gender", { defaultValue: "Gender" })}
              </Text>
            </View>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {player?.gender ? genderLabel(player.gender) : "—"}
            </Text>
          </View>
        </View>

        {/* Tabs — match the PWA: Analytics / Positions / Clubs */}
        <SegmentedTabs
          segments={[
            {
              key: "analytics",
              label: t("tabs.analytics", { defaultValue: "Analytics" }),
            },
            {
              key: "positions",
              label: t("tabs.positions", { defaultValue: "Positions" }),
            },
            { key: "clubs", label: t("tabs.clubs", { defaultValue: "Clubs" }) },
          ]}
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
          style={styles.tabs}
        />

        {activeTab === "analytics" ? (
          <View style={styles.section}>{analyticsContent}</View>
        ) : activeTab === "positions" ? (
          <View style={styles.section}>{positionsContent}</View>
        ) : (
          <MyClubsTab />
        )}
      </Screen>
    </>
  );
}

/** One tile of the 2x2 all-time stats grid (mirrors the web Analytics grid). */
function StatTile({
  icon,
  iconColor,
  value,
  valueSuffix,
  label,
}: {
  icon: IoniconsName;
  iconColor: string;
  value: string | number;
  valueSuffix?: string;
  label: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.statTile,
        { borderColor: theme.cardBorder, backgroundColor: theme.card },
      ]}
    >
      <Ionicons name={icon} size={18} color={iconColor} />
      <Text style={[styles.statValue, { color: theme.text }]}>
        {value}
        {valueSuffix ? (
          <Text style={[styles.statValueSuffix, { color: theme.textSecondary }]}>
            {valueSuffix}
          </Text>
        ) : null}
      </Text>
      <Text
        style={[styles.statLabel, { color: theme.textSecondary }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  editTitle: { ...typography.h2, marginTop: spacing.sm },
  editDescription: {
    ...typography.bodySm,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  headerText: { flex: 1, gap: 2 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  name: { ...typography.h1, flexShrink: 1 },
  editButton: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  subline: { ...typography.bodySm },
  infoRow: {
    flexDirection: "row",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    marginBottom: spacing.lg,
  },
  infoItem: { flex: 1, gap: spacing.xs },
  infoItemCenter: { alignItems: "center" },
  infoItemEnd: { alignItems: "flex-end" },
  infoLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  infoLabel: { ...typography.label },
  infoValue: { ...typography.body, fontWeight: "700" },
  tabs: { marginBottom: spacing.lg },
  section: { gap: spacing.lg },
  cardLabel: { ...typography.label, marginBottom: spacing.sm },
  positionBlock: { marginBottom: spacing.md },
  primaryPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
  },
  primaryPillText: { ...typography.h3 },
  dot: { width: 8, height: 8, borderRadius: radii.full },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  // Stats section
  statsLoading: { paddingVertical: spacing.xl, alignItems: "center" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statTile: {
    flexBasis: "47%",
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  statValue: { fontSize: 22, fontWeight: "700", lineHeight: 26 },
  statValueSuffix: { ...typography.bodySm, fontWeight: "400" },
  statLabel: { ...typography.caption },
  setRecordBlock: { marginTop: spacing.lg },
  setRecordLabels: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs + 2,
  },
  setRecordText: { ...typography.bodySm, fontWeight: "600" },
  setRecordTrack: {
    height: 8,
    borderRadius: radii.full,
    overflow: "hidden",
    flexDirection: "row",
  },
  statsEmpty: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  statsEmptyText: { ...typography.bodySm, fontWeight: "500" },
  statsEmptyHint: { ...typography.caption },
});
