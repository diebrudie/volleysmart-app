/**
 * Notification preferences. Web reference:
 * apps/web/src/pages/NotificationPreferences.tsx (mobile stacked layout).
 * Category groups (Club Activity / Events / Games / Engagement) with per-row
 * In-App / Push / Email switches; Push + Email are disabled ("coming soon").
 * Toggles are optimistic via useNotificationPreferences.
 */

import { View, Text, Switch, Pressable, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { NotificationType } from "@volleysmart/core";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import {
  useNotificationPreferences,
  type NotificationChannel,
} from "@/hooks/useNotificationPreferences";
import { useTheme } from "@/hooks/useTheme";
import { icons, type IoniconsName } from "@/constants/icons";
import { spacing, radii, typography } from "@/constants/theme";
import type { NotificationColorKey } from "@/components/notifications/notificationMeta";

// ─── Row / category config (mirrors the web page) ───────────────────────────

interface PrefRowConfig {
  titleKey: string;
  titleDefault: string;
  descriptionKey: string;
  descriptionDefault: string;
  icon: IoniconsName;
  colorKey: NotificationColorKey;
  types: NotificationType[];
}

const clubActivityRows: PrefRowConfig[] = [
  {
    titleKey: "preferences.row.clubRequests.title",
    titleDefault: "Club Requests",
    descriptionKey: "preferences.row.clubRequests.description",
    descriptionDefault:
      "When someone requests to join your club, or your own request is accepted or declined.",
    icon: icons.userPlus,
    colorKey: "accent",
    types: ["club_join_request", "club_join_accepted", "club_join_rejected"],
  },
  {
    titleKey: "preferences.row.memberChanges.title",
    titleDefault: "Member Changes",
    descriptionKey: "preferences.row.memberChanges.description",
    descriptionDefault:
      "When a member joins, leaves, or is removed from your club.",
    icon: icons.users,
    colorKey: "accent",
    types: ["club_member_joined", "club_member_left", "club_member_removed"],
  },
];

const eventRows: PrefRowConfig[] = [
  {
    titleKey: "type.eventCreated.title",
    titleDefault: "New Event",
    descriptionKey: "preferences.row.eventCreated.description",
    descriptionDefault: "When a new event is created in one of your clubs.",
    icon: icons.calendarDays,
    colorKey: "primary",
    types: ["event_created"],
  },
  {
    titleKey: "type.eventCancelled.title",
    titleDefault: "Event Cancelled",
    descriptionKey: "preferences.row.eventCancelled.description",
    descriptionDefault: "When an event in your club is cancelled.",
    icon: icons.calendarDays,
    colorKey: "danger",
    types: ["event_cancelled"],
  },
  {
    titleKey: "type.rsvp.title",
    titleDefault: "RSVP Update",
    descriptionKey: "preferences.row.rsvp.description",
    descriptionDefault: "When someone updates their attendance for an event.",
    icon: icons.messageSquare,
    colorKey: "primary",
    types: ["event_rsvp"],
  },
  {
    titleKey: "type.rsvpReminder.title",
    titleDefault: "RSVP Reminder",
    descriptionKey: "preferences.row.rsvpReminder.description",
    descriptionDefault: "A reminder on the last day to RSVP for an event.",
    icon: icons.bell,
    colorKey: "warning",
    types: ["rsvp_deadline_reminder"],
  },
];

const gameRows: PrefRowConfig[] = [
  {
    titleKey: "type.gameStarted.title",
    titleDefault: "Game Started",
    descriptionKey: "preferences.row.gameStarted.description",
    descriptionDefault: "When a game starts in one of your clubs.",
    icon: icons.trophy,
    colorKey: "success",
    types: ["game_started"],
  },
];

const engagementRow: PrefRowConfig = {
  titleKey: "preferences.row.engagement.title",
  titleDefault: "Tips & Reminders",
  descriptionKey: "preferences.row.engagement.description",
  descriptionDefault:
    "Helpful reminders to get started, create events, and stay active.",
  icon: icons.star,
  colorKey: "primary",
  types: [
    "engagement_welcome",
    "engagement_create_club",
    "engagement_create_event",
    "engagement_public_event",
    "engagement_come_back",
  ],
};

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function NotificationSettingsScreen() {
  const { t } = useTranslation("notifications");
  const theme = useTheme();
  const { prefs, isLoading, toggleTypes, isChannelOn } =
    useNotificationPreferences();

  const handleToggle = async (
    types: NotificationType[],
    channel: NotificationChannel,
    value: boolean
  ) => {
    const ok = await toggleTypes(types, channel, value);
    if (ok) {
      toast(t("preferences.saved", { defaultValue: "Preference saved" }));
    }
  };

  const renderToggleColumn = (
    label: string,
    checked: boolean,
    disabled: boolean,
    comingSoon: boolean,
    onChange?: (value: boolean) => void
  ) => (
    <View style={styles.toggleColumn}>
      <Text style={[styles.toggleLabel, { color: theme.mutedForeground }]}>
        {label}
      </Text>
      <Switch
        value={checked}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: theme.border, true: theme.primary }}
        thumbColor={theme.card}
        style={disabled ? styles.switchDisabled : undefined}
      />
      {comingSoon && (
        <Text style={[styles.comingSoon, { color: theme.mutedForeground }]}>
          {t("preferences.comingSoon", { defaultValue: "Coming soon" })}
        </Text>
      )}
    </View>
  );

  const renderToggles = (types: NotificationType[]) => (
    <View style={styles.togglesRow}>
      {renderToggleColumn(
        t("preferences.channel.inApp", { defaultValue: "In-app" }),
        isChannelOn(types, "in_app"),
        false,
        false,
        (value) => handleToggle(types, "in_app", value)
      )}
      {renderToggleColumn(
        t("preferences.channel.push", { defaultValue: "Push" }),
        isChannelOn(types, "push"),
        true,
        true
      )}
      {renderToggleColumn(
        t("preferences.channel.email", { defaultValue: "Email" }),
        isChannelOn(types, "email"),
        true,
        true
      )}
    </View>
  );

  const renderRow = (row: PrefRowConfig, isLast: boolean) => (
    <View
      key={row.types.join(",")}
      style={[
        styles.rowContainer,
        !isLast && { borderBottomWidth: 1, borderBottomColor: theme.cardBorder },
      ]}
    >
      <View style={styles.rowHeader}>
        <View style={[styles.iconCircle, { backgroundColor: theme.muted }]}>
          <Ionicons name={row.icon} size={16} color={theme[row.colorKey]} />
        </View>
        <Text style={[styles.rowTitle, { color: theme.text }]}>
          {t(row.titleKey, { defaultValue: row.titleDefault })}
        </Text>
      </View>
      <Text style={[styles.rowDescription, { color: theme.mutedForeground }]}>
        {t(row.descriptionKey, { defaultValue: row.descriptionDefault })}
      </Text>
      <View style={styles.rowToggles}>{renderToggles(row.types)}</View>
    </View>
  );

  const renderCategory = (
    label: string,
    rows: PrefRowConfig[],
    withToggleAll: boolean
  ) => {
    const allTypes = rows.flatMap((r) => r.types);
    const allOn = isChannelOn(allTypes, "in_app");

    return (
      <View style={styles.category}>
        <View style={styles.categoryHeader}>
          <Text
            style={[styles.categoryLabel, { color: theme.mutedForeground }]}
          >
            {label}
          </Text>
          {withToggleAll && (
            <Pressable
              onPress={() => handleToggle(allTypes, "in_app", !allOn)}
              accessibilityRole="button"
            >
              <Text style={[styles.toggleAllText, { color: theme.primary }]}>
                {allOn
                  ? t("preferences.disableAll", { defaultValue: "Disable all" })
                  : t("preferences.enableAll", { defaultValue: "Enable all" })}
              </Text>
            </Pressable>
          )}
        </View>
        <View
          style={[
            styles.categoryCard,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
          ]}
        >
          {rows.map((row, i) => renderRow(row, i === rows.length - 1))}
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={t("preferences.title", {
          defaultValue: "Notification Preferences",
        })}
      />
      <Screen safeTop={false}>
        {isLoading && !prefs ? (
          <Spinner />
        ) : (
          <>
            {renderCategory(
              t("preferences.category.clubActivity", {
                defaultValue: "Club Activity",
              }),
              clubActivityRows,
              true
            )}
            {renderCategory(
              t("preferences.category.events", { defaultValue: "Events" }),
              eventRows,
              true
            )}
            {renderCategory(
              t("preferences.category.games", { defaultValue: "Games" }),
              gameRows,
              true
            )}
            {renderCategory(
              t("preferences.category.engagement", {
                defaultValue: "Engagement & Tips",
              }),
              [engagementRow],
              false
            )}
          </>
        )}
      </Screen>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const ICON_CIRCLE = spacing.xxxl; // 32
const ROW_INDENT = ICON_CIRCLE + spacing.md; // icon + gap

const styles = StyleSheet.create({
  category: {
    marginTop: spacing.xxl,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  categoryLabel: {
    ...typography.label,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  toggleAllText: {
    ...typography.caption,
    fontWeight: "500",
  },
  categoryCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  rowContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  iconCircle: {
    width: ICON_CIRCLE,
    height: ICON_CIRCLE,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    ...typography.bodySm,
    fontWeight: "500",
    flexShrink: 1,
  },
  rowDescription: {
    ...typography.caption,
    paddingLeft: ROW_INDENT,
    marginBottom: spacing.md,
  },
  rowToggles: {
    paddingLeft: ROW_INDENT,
  },
  togglesRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  toggleColumn: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
  },
  toggleLabel: {
    ...typography.caption,
  },
  comingSoon: {
    ...typography.caption,
    opacity: 0.6,
  },
  switchDisabled: {
    opacity: 0.5,
  },
});
