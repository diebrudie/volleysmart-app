import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { palette } from "@/constants/colors";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";
import { Badge } from "@/components/ui/Badge";
import { type PlannedEvent } from "@volleysmart/core";

type Props = {
  event: PlannedEvent;
  currentPlayerId?: string | null;
  onPress?: () => void;
};

const localDateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatDateParts = (dateStr: string, locale: string) => {
  const date = new Date(dateStr + "T00:00:00");
  const day = date.getDate();
  const month = new Intl.DateTimeFormat(locale, { month: "short" }).format(
    date
  );
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
    date
  );
  return { day, month, weekday };
};

const formatTime = (time: string) => time.slice(0, 5);

export function EventCard({ event, currentPlayerId, onPress }: Props) {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation("events");
  const locale = i18n.language || "en";

  const todayKey = localDateKey(new Date());
  const isToday = event.date === todayKey;
  const isCancelled = event.status === "cancelled";

  const { day, month, weekday } = formatDateParts(event.date, locale);
  const attendingCount =
    event.event_rsvp?.filter((r) => r.status === "attending").length ?? 0;
  const userRsvp = currentPlayerId
    ? event.event_rsvp?.find((r) => r.player_id === currentPlayerId)
    : undefined;

  const deadlineLabel = (() => {
    if (!event.rsvp_deadline || userRsvp) return null;
    const deadlineKey = event.rsvp_deadline.split("T")[0];
    if (deadlineKey === todayKey) {
      return tr("card.rsvpByToday", { defaultValue: "RSVP by today" });
    }
    const d = new Date(deadlineKey + "T00:00:00");
    const formatted = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    }).format(d);
    return tr("card.rsvpBy", {
      defaultValue: "RSVP by {{date}}",
      date: formatted,
    });
  })();

  const genderLabel =
    event.event_gender && event.event_gender !== "mixed"
      ? event.event_gender === "women_only"
        ? tr("card.genderWomenOnly", { defaultValue: "Women Only" })
        : event.event_gender === "queer"
          ? tr("card.genderQueer", { defaultValue: "Queer" })
          : event.event_gender === "flinta"
            ? tr("card.genderFlinta", { defaultValue: "Flinta" })
            : tr("card.genderMenOnly", { defaultValue: "Men Only" })
      : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: t.card,
          borderColor: isToday ? t.primary : t.cardBorder,
        },
        isCancelled && styles.cancelled,
        pressed && { opacity: 0.7 },
      ]}
    >
      <View
        style={[
          styles.dateBadge,
          {
            backgroundColor: isToday ? t.primary : t.muted,
            borderColor: isToday ? t.primary : t.cardBorder,
          },
        ]}
      >
        <Text
          style={[
            styles.dateMonth,
            { color: isToday ? palette.white : t.textSecondary },
          ]}
        >
          {isToday ? tr("card.today", { defaultValue: "Today" }) : month}
        </Text>
        <Text
          style={[
            styles.dateDay,
            { color: isToday ? palette.white : t.text },
          ]}
        >
          {day}
        </Text>
        <Text
          style={[
            styles.dateWeekday,
            { color: isToday ? palette.white : t.textSecondary },
          ]}
        >
          {weekday}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: t.text }]}
            numberOfLines={1}
          >
            {event.title}
          </Text>
          {isCancelled ? (
            <Badge
              label={tr("card.cancelled", { defaultValue: "Cancelled" })}
              variant="danger"
            />
          ) : null}
        </View>

        <View style={styles.infoRow}>
          <Ionicons name={icons.clock} size={14} color={t.textSecondary} />
          <Text
            style={[styles.infoText, { color: t.textSecondary }]}
            numberOfLines={1}
          >
            {weekday}, {month} {day} · {formatTime(event.start_time)}
            {event.end_time ? ` - ${formatTime(event.end_time)}` : ""}
          </Text>
        </View>

        {event.locations?.name ? (
          <View style={styles.infoRow}>
            <Ionicons name={icons.mapPin} size={14} color={t.textSecondary} />
            <Text
              style={[styles.infoText, { color: t.textSecondary }]}
              numberOfLines={1}
            >
              {event.locations.name}
            </Text>
          </View>
        ) : null}

        <View style={styles.infoRow}>
          <Ionicons name={icons.users} size={14} color={t.textSecondary} />
          <Text
            style={[styles.infoText, { color: t.textSecondary }]}
            numberOfLines={1}
          >
            {tr("card.attending", {
              defaultValue: "{{count}} attending",
              count: attendingCount,
            })}
            {event.max_players ? ` / ${event.max_players}` : ""}
            {event.clubs?.name ? ` · ${event.clubs.name}` : ""}
          </Text>
        </View>

        {userRsvp?.status === "attending" ? (
          <View style={styles.infoRow}>
            <Ionicons
              name={icons.checkCircle}
              size={14}
              color={t.success}
            />
            <Text style={[styles.statusText, { color: t.success }]}>
              {tr("card.youreGoing", { defaultValue: "You're going" })}
            </Text>
          </View>
        ) : userRsvp?.status === "declined" ? (
          <View style={styles.infoRow}>
            <Ionicons
              name={icons.xCircle}
              size={14}
              color={t.textSecondary}
            />
            <Text style={[styles.statusText, { color: t.textSecondary }]}>
              {tr("card.youDeclined", { defaultValue: "You declined" })}
            </Text>
          </View>
        ) : deadlineLabel ? (
          <View style={styles.infoRow}>
            <Ionicons
              name={icons.calendarDays}
              size={14}
              color={t.textSecondary}
            />
            <Text style={[styles.infoText, { color: t.textSecondary }]}>
              {deadlineLabel}
            </Text>
          </View>
        ) : null}

        {(event.is_public || genderLabel) && !isCancelled ? (
          <View style={styles.badges}>
            {event.is_public ? (
              <Badge
                label={tr("card.public", { defaultValue: "Public" })}
                variant="default"
              />
            ) : null}
            {genderLabel ? (
              <Badge label={genderLabel} variant="warning" />
            ) : null}
          </View>
        ) : null}
      </View>

      <Ionicons
        name={icons.chevronRight}
        size={20}
        color={t.textSecondary}
        style={styles.chevron}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  cancelled: { opacity: 0.6 },
  dateBadge: {
    width: 52,
    alignItems: "center",
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingVertical: spacing.sm - 2,
    paddingHorizontal: spacing.xs,
    alignSelf: "flex-start",
  },
  dateMonth: {
    ...typography.caption,
    fontWeight: "600",
    textTransform: "uppercase",
    fontSize: 10,
  },
  dateDay: { fontSize: 22, fontWeight: "700", lineHeight: 26 },
  dateWeekday: { ...typography.caption, fontWeight: "500", fontSize: 11 },
  content: { flex: 1, gap: 2 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: { ...typography.body, fontWeight: "600", flexShrink: 1 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  infoText: { ...typography.bodySm, flexShrink: 1 },
  statusText: { ...typography.bodySm, fontWeight: "600" },
  badges: {
    flexDirection: "row",
    gap: spacing.xs + 2,
    marginTop: spacing.xs,
  },
  chevron: { alignSelf: "center" },
});
