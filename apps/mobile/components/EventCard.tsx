import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Badge } from "@/components/ui/Badge";
import { type PlannedEvent } from "@volleysmart/core";

type Props = {
  event: PlannedEvent;
  currentPlayerId?: string | null;
  onPress?: () => void;
};

const formatDate = (dateStr: string, locale: string) => {
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
  const today = new Date().toISOString().split("T")[0];
  const isToday = event.date === today;

  const { day, month, weekday } = formatDate(event.date, "en");
  const attendingCount =
    event.event_rsvp?.filter((r) => r.status === "attending").length ?? 0;
  const userRsvp = currentPlayerId
    ? event.event_rsvp?.find((r) => r.player_id === currentPlayerId)
    : undefined;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: t.surface,
          borderColor: isToday ? t.primary : t.border,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View
        style={[
          styles.dateBadge,
          { backgroundColor: isToday ? t.primary : t.background },
        ]}
      >
        <Text
          style={[
            styles.dateMonth,
            { color: isToday ? "#fff" : t.textSecondary },
          ]}
        >
          {month}
        </Text>
        <Text style={[styles.dateDay, { color: isToday ? "#fff" : t.text }]}>
          {day}
        </Text>
        <Text
          style={[
            styles.dateWeekday,
            { color: isToday ? "#fff" : t.textSecondary },
          ]}
        >
          {weekday}
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
          {event.title}
        </Text>

        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={14} color={t.textSecondary} />
          <Text style={[styles.infoText, { color: t.textSecondary }]}>
            {formatTime(event.start_time)}
            {event.end_time ? ` - ${formatTime(event.end_time)}` : ""}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="people-outline" size={14} color={t.textSecondary} />
          <Text style={[styles.infoText, { color: t.textSecondary }]}>
            {attendingCount}
            {event.max_players ? ` / ${event.max_players}` : ""}
          </Text>
        </View>

        <View style={styles.badges}>
          {event.status === "cancelled" && (
            <Badge label="Cancelled" variant="danger" />
          )}
          {userRsvp?.status === "attending" && (
            <Badge label="Going" variant="success" />
          )}
          {userRsvp?.status === "declined" && (
            <Badge label="Not going" variant="default" />
          )}
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
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
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  dateBadge: {
    width: 52,
    alignItems: "center",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  dateMonth: { fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
  dateDay: { fontSize: 22, fontWeight: "700", lineHeight: 26 },
  dateWeekday: { fontSize: 11, fontWeight: "500" },
  content: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: "600" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  infoText: { fontSize: 13 },
  badges: { flexDirection: "row", gap: 6, marginTop: 4 },
  chevron: { alignSelf: "center" },
});
