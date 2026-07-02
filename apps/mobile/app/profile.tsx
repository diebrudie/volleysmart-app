import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { supabase } from "@/constants/supabase";
import { Screen } from "@/components/ui/Screen";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { useUserClubs } from "@/hooks/useUserClubs";

export default function ProfileScreen() {
  const { t } = useTranslation("profile");
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: player, isLoading: playerLoading } = usePlayerProfile();
  const { data: clubs } = useUserClubs();

  const firstName =
    player?.first_name ?? user?.user_metadata?.first_name ?? "";
  const lastName = player?.last_name ?? user?.user_metadata?.last_name ?? "";
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") || "Player";

  const primaryPosition = player?.player_positions?.find(
    (pp: any) => pp.is_primary
  );
  const secondaryPositions =
    player?.player_positions?.filter((pp: any) => !pp.is_primary) ?? [];

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["player-profile"] }),
      queryClient.invalidateQueries({ queryKey: ["user-clubs"] }),
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: t("title", { defaultValue: "Profile" }),
          headerBackTitle: t("back", { defaultValue: "Back" }),
          headerTintColor: theme.primary,
          headerStyle: { backgroundColor: theme.background },
        }}
      />
      <Screen onRefresh={handleRefresh}>
        <View style={styles.header}>
          <Avatar uri={player?.image_url} name={fullName} size={72} />
          <Text style={[styles.name, { color: theme.text }]}>{fullName}</Text>
          <Text style={[styles.email, { color: theme.textSecondary }]}>
            {user?.email}
          </Text>
        </View>

        {playerLoading ? (
          <Spinner />
        ) : (
          <View style={styles.section}>
            {player?.bio && (
              <Card>
                <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>
                  {t("bio", { defaultValue: "Bio" })}
                </Text>
                <Text style={[styles.bioText, { color: theme.text }]}>
                  {player.bio}
                </Text>
              </Card>
            )}

            {(primaryPosition || secondaryPositions.length > 0) && (
              <Card>
                <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>
                  {t("positions", { defaultValue: "Positions" })}
                </Text>
                <View style={styles.positionList}>
                  {primaryPosition && (
                    <Badge
                      label={primaryPosition.positions?.name ?? ""}
                      variant="success"
                    />
                  )}
                  {secondaryPositions.map((pp: any) => (
                    <Badge
                      key={pp.id}
                      label={pp.positions?.name ?? ""}
                      variant="default"
                    />
                  ))}
                </View>
              </Card>
            )}

            <Card>
              <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>
                {t("stats", { defaultValue: "Stats" })}
              </Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: theme.text }]}>
                    {clubs?.length ?? 0}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: theme.textSecondary }]}
                  >
                    {t("clubCount", { defaultValue: "Clubs" })}
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        <View style={styles.signOut}>
          <Button
            title={t("signOut", { defaultValue: "Sign out" })}
            variant="outline"
            onPress={() => supabase.auth.signOut()}
          />
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", marginTop: 8, marginBottom: 24, gap: 8 },
  name: { fontSize: 22, fontWeight: "700" },
  email: { fontSize: 14 },
  section: { gap: 16 },
  cardLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  bioText: { fontSize: 15, lineHeight: 22 },
  positionList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statsRow: { flexDirection: "row", gap: 24 },
  statItem: { alignItems: "center" },
  statNumber: { fontSize: 20, fontWeight: "700" },
  statLabel: { fontSize: 12, marginTop: 2 },
  signOut: { marginTop: 32 },
});
