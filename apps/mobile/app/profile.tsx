import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { supabase } from "@/constants/supabase";
import { Screen } from "@/components/ui/Screen";
import { KeyboardAwareScreen } from "@/components/ui/KeyboardAwareScreen";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Spinner } from "@/components/ui/Spinner";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { MyClubsTab } from "@/components/profile/MyClubsTab";
import { DeleteAccountDialog } from "@/components/profile/DeleteAccountDialog";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { queryKeys } from "@/constants/queryKeys";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";

type TabKey = "profile" | "clubs";

export default function ProfileScreen() {
  const { t, i18n } = useTranslation("profile");
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: player, isLoading: playerLoading } = usePlayerProfile();

  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
    <Stack.Screen
      options={{
        headerShown: true,
        headerTitle: t("pageTitle", { defaultValue: "Profile" }),
        headerBackTitle: t("common:button.back", { defaultValue: "Back" }),
        headerTintColor: theme.primary,
        headerStyle: { backgroundColor: theme.background },
      }}
    />
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

        {/* Tabs (web also has Analytics — deferred on mobile) */}
        <SegmentedTabs
          segments={[
            {
              key: "profile",
              label: t("tabs.profile", { defaultValue: "Profile" }),
            },
            { key: "clubs", label: t("tabs.clubs", { defaultValue: "Clubs" }) },
          ]}
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
          style={styles.tabs}
        />

        {activeTab === "profile" ? (
          <View style={styles.section}>
            {player?.bio ? (
              <Card>
                <Text
                  style={[styles.cardLabel, { color: theme.textSecondary }]}
                >
                  {t("edit.bio", { defaultValue: "Bio" })}
                </Text>
                <Text style={[styles.bioText, { color: theme.text }]}>
                  {player.bio}
                </Text>
              </Card>
            ) : null}

            {/* Positions (mirrors the web Positions tab) */}
            {primaryPosition || secondaryPositions.length > 0 ? (
              <Card>
                {primaryPosition ? (
                  <View style={styles.positionBlock}>
                    <Text
                      style={[
                        styles.cardLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {t("positions.mainPosition", {
                        defaultValue: "Main Position",
                      })}
                    </Text>
                    <View
                      style={[
                        styles.primaryPill,
                        {
                          borderColor: theme.primary,
                          backgroundColor: theme.muted,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: theme.primary },
                        ]}
                      />
                      <Text
                        style={[styles.primaryPillText, { color: theme.primary }]}
                      >
                        {positionLabel(primaryPosition.positions?.name)}
                      </Text>
                    </View>
                  </View>
                ) : null}
                {secondaryPositions.length > 0 ? (
                  <View style={styles.positionBlock}>
                    <Text
                      style={[
                        styles.cardLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {t("positions.secondaryPositions", {
                        defaultValue: "Secondary Positions",
                      })}
                    </Text>
                    <View style={styles.chipRow}>
                      {secondaryPositions.map((pp: any) => (
                        <Chip
                          key={pp.id}
                          label={positionLabel(pp.positions?.name)}
                        />
                      ))}
                    </View>
                  </View>
                ) : null}
              </Card>
            ) : (
              <Card>
                <Text
                  style={[styles.cardLabel, { color: theme.textSecondary }]}
                >
                  {t("positions.mainPosition", {
                    defaultValue: "Main Position",
                  })}
                </Text>
                <Text style={[typography.body, { color: theme.textSecondary }]}>
                  {t("positions.noPositions", {
                    defaultValue: "No positions set yet.",
                  })}
                </Text>
              </Card>
            )}

            {/* Account section */}
            <View style={styles.accountSection}>
              <Text
                style={[styles.accountTitle, { color: theme.textSecondary }]}
              >
                {t("account.sectionTitle", { defaultValue: "Account" })}
              </Text>
              <Button
                title={t("common:nav.logOut", { defaultValue: "Log Out" })}
                variant="outline"
                onPress={() => supabase.auth.signOut()}
              />
              <Pressable
                onPress={() => setShowDeleteDialog(true)}
                accessibilityRole="button"
                style={styles.deleteRow}
              >
                <Ionicons
                  name={icons.trash2}
                  size={16}
                  color={theme.destructive}
                />
                <Text
                  style={[styles.deleteText, { color: theme.destructive }]}
                >
                  {t("account.deleteAccount", {
                    defaultValue: "Delete my account",
                  })}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <MyClubsTab />
        )}
      </Screen>

      <DeleteAccountDialog
        visible={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        userId={user?.id}
        imageUrl={player?.image_url}
      />
    </>
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
    marginTop: spacing.sm,
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
  bioText: { ...typography.body, lineHeight: 22 },
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
  accountSection: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  accountTitle: { ...typography.label },
  deleteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  deleteText: { ...typography.bodySm, fontWeight: "500" },
});
