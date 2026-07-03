/**
 * Home tab — mobile port of apps/web/src/pages/HomeDashboard.tsx:
 * greeting, snap card slider (today/next event, last game, month stats —
 * or onboarding cards for new users), My Clubs scroller, Discover Events.
 */
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { useUserClubs } from "@/hooks/useUserClubs";
import {
  homeQueryKeyPrefixes,
  useTodayNextEvent,
  useLastGame,
  useMonthStats,
} from "@/hooks/useHomeDashboard";
import { CardSlider } from "@/components/home/CardSlider";
import { TodayNextCard } from "@/components/home/TodayNextCard";
import { LastGameCard } from "@/components/home/LastGameCard";
import { MonthStatsCard } from "@/components/home/MonthStatsCard";
import { DiscoverSection } from "@/components/home/DiscoverSection";
import { ClubCard } from "@/components/ClubCard";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";

export default function HomeScreen() {
  const { t } = useTranslation("home");
  const { t: tEvents } = useTranslation("events");
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: player } = usePlayerProfile();
  const { data: clubs, isLoading: clubsLoading } = useUserClubs();

  const { data: todaysEvent, isLoading: todayLoading } = useTodayNextEvent();
  const { data: lastGame, isLoading: lastGameLoading } = useLastGame();
  const { data: monthStats } = useMonthStats();

  const firstName =
    player?.first_name ?? user?.user_metadata?.first_name ?? "";
  const isNewUser = !clubsLoading && (clubs?.length ?? 0) === 0;

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["user-clubs"] }),
      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] }),
      queryClient.invalidateQueries({ queryKey: ["discover-events"] }),
      queryClient.invalidateQueries({
        queryKey: [homeQueryKeyPrefixes.todayNext],
      }),
      queryClient.invalidateQueries({
        queryKey: [homeQueryKeyPrefixes.lastGame],
      }),
      queryClient.invalidateQueries({
        queryKey: [homeQueryKeyPrefixes.monthStats],
      }),
    ]);
  };

  const cardFrame = [
    styles.onboardingCard,
    { backgroundColor: theme.card, borderColor: theme.cardBorder },
  ];

  return (
    <Screen onRefresh={handleRefresh} safeTop={false}>
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: theme.textSecondary }]}>
          {t("greeting", { defaultValue: "Welcome back," })}{" "}
          <Text style={[styles.greetingName, { color: theme.text }]}>
            {firstName || t("player", { defaultValue: "Player" })}
          </Text>
        </Text>
      </View>

      {isNewUser ? (
        /* ── Onboarding slider for users without a club ─────────────── */
        <CardSlider>
          {/* Card 1 — Welcome + skill level */}
          <View style={cardFrame}>
            <View style={styles.cardHeaderRow}>
              <Ionicons
                name="football-outline"
                size={18}
                color={theme.primary}
              />
              <Text
                style={[styles.cardHeaderLabel, { color: theme.textSecondary }]}
              >
                {tEvents("home.onboarding.welcome", { defaultValue: "Welcome" })}
              </Text>
            </View>
            <Text style={[styles.onboardingTitle, { color: theme.text }]}>
              {tEvents("home.onboarding.hiName", {
                defaultValue: "Hi {{name}}!",
                name: firstName,
              })}
            </Text>
            {player?.skill_rating != null ? (
              <View style={styles.skillBlock}>
                <View style={styles.skillLabelRow}>
                  <Text
                    style={[styles.skillLabel, { color: theme.textSecondary }]}
                  >
                    {tEvents("home.onboarding.yourSkillLevel", {
                      defaultValue: "Your skill level",
                    })}
                  </Text>
                  <Text style={[styles.skillValue, { color: theme.text }]}>
                    {player.skill_rating}/100
                  </Text>
                </View>
                <View
                  style={[styles.skillTrack, { backgroundColor: theme.muted }]}
                >
                  <View
                    style={[
                      styles.skillFill,
                      {
                        backgroundColor: theme.primary,
                        width: `${Math.min(player.skill_rating, 100)}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ) : null}
            <Button
              title={tEvents("home.onboarding.viewProfile", {
                defaultValue: "View Profile",
              })}
              variant="outline"
              onPress={() => router.push("/profile" as never)}
              style={styles.onboardingButton}
            />
          </View>

          {/* Card 2 — Create or join a club */}
          <View
            style={[
              styles.onboardingCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.primary + "4D",
              },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <Ionicons name={icons.users} size={18} color={theme.primary} />
              <Text
                style={[styles.cardHeaderLabel, { color: theme.textSecondary }]}
              >
                {tEvents("home.onboarding.getStarted", {
                  defaultValue: "Get Started",
                })}
              </Text>
            </View>
            <Text
              style={[styles.onboardingBody, { color: theme.textSecondary }]}
            >
              {tEvents("home.onboarding.clubsDescription", {
                defaultValue:
                  "Clubs are where the action happens. Create your own or join an existing one.",
              })}
            </Text>
            <View style={styles.onboardingActions}>
              <Button
                title={tEvents("home.onboarding.createClub", {
                  defaultValue: "Create a Club",
                })}
                onPress={() => router.push("/clubs/create" as never)}
                style={styles.onboardingButton}
              />
              <Button
                title={tEvents("home.onboarding.browseClubs", {
                  defaultValue: "Browse Clubs",
                })}
                variant="outline"
                onPress={() => router.push("/(tabs)/clubs" as never)}
                style={styles.onboardingButton}
              />
            </View>
          </View>

          {/* Card 3 — Analytics teaser */}
          <MonthStatsCard
            stats={undefined}
            placeholder
            onPress={() => router.push("/profile" as never)}
          />
        </CardSlider>
      ) : (
        /* ── Regular slider: today/next event, last game, month stats ── */
        <CardSlider>
          {todaysEvent ? (
            <TodayNextCard event={todaysEvent} loading={todayLoading} />
          ) : (
            <LastGameCard game={lastGame} loading={lastGameLoading} />
          )}
          {todaysEvent ? (
            <LastGameCard game={lastGame} loading={lastGameLoading} />
          ) : (
            <TodayNextCard event={todaysEvent} loading={todayLoading} />
          )}
          <MonthStatsCard
            stats={monthStats}
            onPress={() => router.push("/profile" as never)}
          />
        </CardSlider>
      )}

      {/* ── My Clubs ─────────────────────────────────────────────────── */}
      {clubs && clubs.length > 0 ? (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t("sections.myClubs", { defaultValue: "My Clubs" })}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.clubScrollBleed}
            contentContainerStyle={styles.clubScroll}
          >
            {clubs.map((club) => (
              <View key={club.club_id} style={styles.clubScrollItem}>
                <ClubCard
                  club={club}
                  onPress={() =>
                    router.push(`/clubs/${club.club_id}` as never)
                  }
                />
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}

      {/* ── Discover Events ──────────────────────────────────────────── */}
      <DiscoverSection />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.md, marginBottom: spacing.xl },
  greeting: { ...typography.body, fontSize: 16 },
  greetingName: { fontWeight: "600" },
  sectionTitle: {
    ...typography.h3,
    fontSize: 18,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  clubScrollBleed: { marginHorizontal: -spacing.lg },
  clubScroll: { gap: spacing.md, paddingHorizontal: spacing.lg },
  clubScrollItem: { width: 280 },
  // Onboarding cards
  onboardingCard: {
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.xl,
    minHeight: 196,
    gap: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cardHeaderLabel: {
    ...typography.label,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  onboardingTitle: { ...typography.h3 },
  onboardingBody: { ...typography.bodySm, lineHeight: 19 },
  onboardingActions: { gap: spacing.sm, marginTop: "auto" },
  onboardingButton: { height: 40 },
  skillBlock: { gap: spacing.xs + 2 },
  skillLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skillLabel: { ...typography.bodySm },
  skillValue: { ...typography.bodySm, fontWeight: "600" },
  skillTrack: {
    height: 8,
    borderRadius: radii.full,
    overflow: "hidden",
  },
  skillFill: { height: "100%", borderRadius: radii.full },
});
