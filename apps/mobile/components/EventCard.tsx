import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { useResolvedScheme } from "@/providers/ThemeProvider";
import { palette } from "@/constants/colors";
import { icons, type IoniconsName } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";
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

// Matches the PWA's fixed calendar-strip red (bg-[#EB534C]) for non-today events
const CALENDAR_RED = "#EB534C";

// Tailwind pill colors used by the PWA card (light / dark)
const pillColors = {
  cancelled: {
    light: { bg: "#fee2e2", text: "#b91c1c" }, // red-100 / red-700
    dark: { bg: "#7f1d1d", text: "#fca5a5" }, // red-900 / red-300
  },
  public: {
    light: { bg: "#dbeafe", text: "#1d4ed8" }, // blue-100 / blue-700
    dark: { bg: "#1e3a8a", text: "#93c5fd" }, // blue-900 / blue-300
  },
  beach: {
    light: { bg: "#fef3c7", text: "#b45309" }, // amber-100 / amber-700
    dark: { bg: "#78350f", text: "#fcd34d" }, // amber-900 / amber-300
  },
  gender: {
    light: { bg: "#f3e8ff", text: "#7e22ce" }, // purple-100 / purple-700
    dark: { bg: "#581c87", text: "#d8b4fe" }, // purple-900 / purple-300
  },
} as const;

function Pill({
  label,
  bg,
  text,
  icon,
}: {
  label: string;
  bg: string;
  text: string;
  icon?: IoniconsName;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={10} color={text} /> : null}
      <Text style={[styles.pillText, { color: text }]}>{label}</Text>
    </View>
  );
}

export function EventCard({ event, currentPlayerId, onPress }: Props) {
  const t = useTheme();
  const scheme = useResolvedScheme();
  const isDark = scheme === "dark";
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
    if (!event.rsvp_deadline) return null;
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

  const todayLabel = tr("card.today", { defaultValue: "Today" });
  const pillMode = isDark ? "dark" : "light";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: t.card, borderColor: t.cardBorder },
        isToday && {
          borderColor: t.primary + "99", // border-primary/60
          backgroundColor: t.primary + (isDark ? "1A" : "0D"), // bg-primary/10 dark, /5 light
        },
        isCancelled && styles.cancelled,
        pressed && { opacity: 0.7 },
      ]}
    >
      {/* Calendar badge: colored month strip + white day/weekday body (PWA parity) */}
      <View
        style={[
          styles.dateBadge,
          { borderColor: isToday ? t.primary : t.cardBorder },
        ]}
      >
        <View
          style={[
            styles.dateBadgeHeader,
            { backgroundColor: isToday ? t.primary : CALENDAR_RED },
          ]}
        >
          <Text style={styles.dateMonth} numberOfLines={1}>
            {isToday ? todayLabel : month}
          </Text>
        </View>
        <View
          style={[
            styles.dateBadgeBody,
            { backgroundColor: isDark ? t.card : palette.white },
          ]}
        >
          <Text style={[styles.dateDay, { color: t.text }]}>{day}</Text>
          <Text style={[styles.dateWeekday, { color: t.mutedForeground }]}>
            {weekday}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
            {event.title}
          </Text>
          {isCancelled ? (
            <Pill
              label={tr("card.cancelled", { defaultValue: "Cancelled" })}
              bg={pillColors.cancelled[pillMode].bg}
              text={pillColors.cancelled[pillMode].text}
            />
          ) : isToday ? (
            <Pill label={todayLabel} bg={t.primary} text={palette.white} />
          ) : null}
        </View>

        <View style={styles.infoRow}>
          <Ionicons name={icons.clock} size={14} color={t.mutedForeground} />
          <Text
            style={[styles.infoText, { color: t.mutedForeground }]}
            numberOfLines={1}
          >
            {weekday}, {month} {day} · {formatTime(event.start_time)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name={icons.users} size={14} color={t.mutedForeground} />
          <Text
            style={[styles.infoText, { color: t.mutedForeground }]}
            numberOfLines={1}
          >
            {tr("card.attending", {
              defaultValue: "{{count}} attending",
              count: attendingCount,
            })}
          </Text>
          {event.is_public ? (
            <Pill
              label={tr("card.public", { defaultValue: "Public" })}
              bg={pillColors.public[pillMode].bg}
              text={pillColors.public[pillMode].text}
              icon={icons.globe}
            />
          ) : null}
          {event.activity_type === "beach" ? (
            <Pill
              label="Beach"
              bg={pillColors.beach[pillMode].bg}
              text={pillColors.beach[pillMode].text}
              icon={icons.palmtree}
            />
          ) : null}
          {genderLabel ? (
            <Pill
              label={genderLabel}
              bg={pillColors.gender[pillMode].bg}
              text={pillColors.gender[pillMode].text}
            />
          ) : null}
        </View>

        {userRsvp?.status === "attending" ? (
          <View style={styles.infoRow}>
            <Ionicons
              name={icons.checkCircle}
              size={14}
              color={isDark ? "#4ade80" : "#16a34a"}
            />
            <Text
              style={[
                styles.statusText,
                { color: isDark ? "#4ade80" : "#16a34a" },
              ]}
            >
              {tr("card.youreGoing", { defaultValue: "You're going" })}
            </Text>
          </View>
        ) : userRsvp?.status === "declined" ? (
          <View style={styles.infoRow}>
            <Ionicons
              name={icons.xCircle}
              size={14}
              color={t.mutedForeground}
            />
            <Text style={[styles.statusText, { color: t.mutedForeground }]}>
              {tr("card.youDeclined", { defaultValue: "You declined" })}
            </Text>
          </View>
        ) : deadlineLabel ? (
          <View style={styles.infoRow}>
            <Ionicons
              name={icons.calendarDays}
              size={14}
              color={t.mutedForeground}
            />
            <Text style={[styles.infoText, { color: t.mutedForeground }]}>
              {deadlineLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <Ionicons
        name={icons.chevronRight}
        size={20}
        color={t.mutedForeground}
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
    width: 56, // w-14
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: "hidden",
    alignSelf: "stretch", // fill the card's full height
  },
  dateBadgeHeader: {
    paddingVertical: 2, // py-0.5
    alignItems: "center",
  },
  dateMonth: {
    color: palette.white,
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  dateBadgeBody: {
    flex: 1, // stretch the day/weekday body to fill remaining height
    paddingVertical: 4, // py-1
    alignItems: "center",
    justifyContent: "center",
  },
  dateDay: { fontSize: 20, fontWeight: "700", lineHeight: 22 },
  dateWeekday: { fontSize: 10 },
  content: { flex: 1, gap: 4 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: { ...typography.body, fontWeight: "600", flexShrink: 1 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2, // gap-1.5
  },
  infoText: { ...typography.bodySm, flexShrink: 1 },
  statusText: { ...typography.bodySm, fontWeight: "500" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6, // px-1.5
    paddingVertical: 2, // py-0.5
    borderRadius: 100,
  },
  pillText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  chevron: { alignSelf: "center" },
});
