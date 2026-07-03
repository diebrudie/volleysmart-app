import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  formatFirstLastInitial,
  type EventAttendeeRow,
  type PlannedEvent,
} from "@volleysmart/core";
import { Avatar } from "@/components/ui/Avatar";
import { useEventAttendees } from "@/hooks/useEventAttendees";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { useTheme } from "@/hooks/useTheme";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";

type Props = {
  event: PlannedEvent;
  currentPlayerId: string | null | undefined;
  isCreator: boolean;
  /** Active member of the hosting club. */
  isMember: boolean;
};

/**
 * "{n} Going" attendee section, mirroring the web EventDetail RSVP section:
 * - public event + non-member who hasn't RSVPed -> "RSVP to see who's going"
 * - public event + non-organizer -> own row (real data) + anonymized others
 * - otherwise -> full list from get_event_attendees (SECURITY DEFINER RPC),
 *   with "Player N" placeholder rows for attendees hidden by RLS.
 */
export function AttendeeList({ event, currentPlayerId, isCreator, isMember }: Props) {
  const { t } = useTranslation("events");
  const { t: tProfile } = useTranslation("profile");
  const theme = useTheme();

  const attendingRsvps = (event.event_rsvp ?? []).filter(
    (r) => r.status === "attending"
  );
  const attendingCount = attendingRsvps.length;
  const isAttending = !!(
    currentPlayerId &&
    attendingRsvps.some((r) => r.player_id === currentPlayerId)
  );

  const { data: attendees = [] } = useEventAttendees(
    attendingCount > 0 ? event.id : null
  );
  const { data: ownProfile } = usePlayerProfile();

  // Sort RPC rows by RSVP time (earliest first), like the web fallback does.
  const rsvpTimeMap = new Map(
    attendingRsvps.map((r) => [r.player_id, r.responded_at ?? ""])
  );
  const sortedAttendees = [...attendees].sort((a, b) =>
    (rsvpTimeMap.get(a.player_id) ?? "").localeCompare(
      rsvpTimeMap.get(b.player_id) ?? ""
    )
  );

  const isPublicNonMember = event.is_public && !isCreator && !isMember;

  const header = (
    <Text style={[styles.header, { color: theme.text }]}>
      {t("detail.countGoing", { count: attendingCount, defaultValue: "{{count}} Going" })}
    </Text>
  );

  // Public event, non-member, not attending: prompt to RSVP.
  if (isPublicNonMember && !isAttending) {
    return (
      <View style={styles.section}>
        {header}
        <Text style={[styles.mutedText, { color: theme.mutedForeground }]}>
          {t("detail.rsvpToSee", { defaultValue: "RSVP to see who's going" })}
        </Text>
      </View>
    );
  }

  // Public event, non-organizer (incl. club members): own row + anonymized rows.
  if (event.is_public && !isCreator) {
    if (attendingCount === 0) {
      return (
        <View style={styles.section}>
          {header}
          <Text style={[styles.mutedText, { color: theme.mutedForeground }]}>
            {t("detail.noResponsesYet", { defaultValue: "No responses yet" })}
          </Text>
        </View>
      );
    }
    const showOwnRow = isAttending && !!ownProfile;
    const othersCount = attendingCount - (showOwnRow ? 1 : 0);
    const primaryPos = showOwnRow
      ? (ownProfile as { player_positions?: Array<{ is_primary: boolean; positions?: { name?: string } | null }> })
          .player_positions?.find((pp) => pp.is_primary)?.positions?.name ?? null
      : null;

    return (
      <View style={styles.section}>
        {header}
        <View style={styles.list}>
          {showOwnRow ? (
            <AttendeeRow
              name={formatFirstLastInitial(ownProfile!.first_name, ownProfile!.last_name)}
              imageUrl={ownProfile!.image_url}
              position={
                primaryPos
                  ? tProfile(`positions.name.${primaryPos}`, { defaultValue: primaryPos })
                  : null
              }
              isYou
            />
          ) : null}
          {Array.from({ length: Math.max(0, othersCount) }).map((_, i) => (
            <AnonymousRow
              key={`anon-${i}`}
              label={t("detail.playerN", { n: i + 1, defaultValue: "Player {{n}}" })}
            />
          ))}
        </View>
      </View>
    );
  }

  // Organizer or club member on a private/club event: full list + placeholders.
  if (attendingCount > 0) {
    return (
      <View style={styles.section}>
        {header}
        <View style={styles.list}>
          {sortedAttendees.map((a: EventAttendeeRow) => (
            <AttendeeRow
              key={a.player_id}
              name={formatFirstLastInitial(a.first_name, a.last_name)}
              imageUrl={a.image_url}
              position={
                a.primary_position
                  ? tProfile(`positions.name.${a.primary_position}`, {
                      defaultValue: a.primary_position,
                    })
                  : null
              }
              isYou={a.player_id === currentPlayerId}
            />
          ))}
          {Array.from({
            length: Math.max(0, attendingCount - sortedAttendees.length),
          }).map((_, i) => (
            <AnonymousRow
              key={`placeholder-${i}`}
              label={t("detail.playerN", {
                n: sortedAttendees.length + i + 1,
                defaultValue: "Player {{n}}",
              })}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {header}
      <Text style={[styles.mutedText, { color: theme.mutedForeground }]}>
        {t("detail.noResponsesYet", { defaultValue: "No responses yet" })}
      </Text>
    </View>
  );
}

function AttendeeRow({
  name,
  imageUrl,
  position,
  isYou = false,
}: {
  name: string;
  imageUrl: string | null;
  position: string | null;
  isYou?: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation("events");
  return (
    <View style={styles.row}>
      <Avatar uri={imageUrl} name={name} size={40} />
      <View style={styles.rowTextCol}>
        <Text style={[styles.rowName, { color: theme.text }]} numberOfLines={1}>
          {name}
        </Text>
        {position ? (
          <Text
            style={[styles.rowPosition, { color: theme.mutedForeground }]}
            numberOfLines={1}
          >
            {position}
          </Text>
        ) : null}
      </View>
      {isYou ? (
        <Text style={[styles.youTag, { color: theme.mutedForeground }]}>
          {t("detail.you", { defaultValue: "You" })}
        </Text>
      ) : null}
    </View>
  );
}

function AnonymousRow({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.anonAvatar, { backgroundColor: theme.muted }]}>
        <Ionicons name={icons.user} size={20} color={theme.mutedForeground} />
      </View>
      <Text style={[styles.rowName, { color: theme.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  header: { ...typography.h3 },
  mutedText: { ...typography.body },
  list: { gap: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  rowTextCol: { flex: 1, minWidth: 0, gap: 1 },
  rowName: { ...typography.bodySm, fontWeight: "600" },
  rowPosition: { ...typography.caption },
  youTag: { ...typography.caption },
  anonAvatar: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
