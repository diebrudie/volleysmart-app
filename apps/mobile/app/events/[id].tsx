import { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { type RsvpStatus } from "@volleysmart/core";
import { AttendeeList } from "@/components/events/AttendeeList";
import { CancelEventDialog } from "@/components/events/CancelEventDialog";
import { EditEventSheet } from "@/components/events/EditEventSheet";
import type { EventFormValues } from "@/components/events/form/EventFormFields";
import { HostedBy } from "@/components/events/HostedBy";
import { RecurringScopeDialog } from "@/components/events/RecurringScopeDialog";
import { RsvpActions } from "@/components/RsvpActions";
import { Dialog } from "@/components/ui/Dialog";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { useClubRole } from "@/hooks/useClubRole";
import { useCurrentPlayerId } from "@/hooks/useCurrentPlayerId";
import { useEventDetail, useEventMatchDay } from "@/hooks/useEventDetail";
import {
  useCancelEvent,
  useDeleteEvent,
  useUpdateEvent,
  type EventEditScope,
} from "@/hooks/useEventMutations";
import { useRsvpMutation } from "@/hooks/useRsvpMutation";
import { useTheme } from "@/hooks/useTheme";
import { icons, type IoniconsName } from "@/constants/icons";
import { queryKeys } from "@/constants/queryKeys";
import { palette, radii, spacing, typography } from "@/constants/theme";

/** English DB value -> translation key, same map as web EventDetail. */
const CANCELLATION_REASON_KEYS: Record<string, string> = {
  "Not enough players": "detail.reasonNotEnoughPlayers",
  "Bad weather": "detail.reasonBadWeather",
  "Venue unavailable": "detail.reasonVenueUnavailable",
  "Scheduling conflict": "detail.reasonSchedulingConflict",
  Other: "detail.reasonOther",
};

function toLocalDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const formatTime = (time: string) => time.slice(0, 5);

export default function EventDetailScreen() {
  const { id, created } = useLocalSearchParams<{ id: string; created?: string }>();
  const { t, i18n } = useTranslation("events");
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: playerId } = useCurrentPlayerId();
  const { data: event, isLoading } = useEventDetail(id);
  const { data: linkedMatchDay } = useEventMatchDay(id);
  const { data: clubRole = "none" } = useClubRole(event?.club_id);
  const rsvpMutation = useRsvpMutation();
  const updateMutation = useUpdateEvent(event);
  const cancelMutation = useCancelEvent(event);
  const deleteMutation = useDeleteEvent(id);

  const [menuOpen, setMenuOpen] = useState(false);
  const [scopeAction, setScopeAction] = useState<"edit" | "cancel" | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editScope, setEditScope] = useState<EventEditScope>("single");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelScope, setCancelScope] = useState<EventEditScope>("single");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [showCreatedDialog, setShowCreatedDialog] = useState(
    created === "true" || created === "1"
  );

  const locale = i18n.language;

  const isCreator = !!event && event.created_by === user?.id;
  const isMember = clubRole !== "none";
  const isRecurring = !!(event?.recurrence_rule || event?.recurrence_parent_id);
  const isCancelled = event?.status === "cancelled";

  const todayStr = toLocalDateString(new Date());
  const isPastEvent = !!event && event.date < todayStr;
  const isEventToday = !!event && event.date === todayStr;

  const attendingRsvps =
    event?.event_rsvp?.filter((r) => r.status === "attending") ?? [];
  const attendingCount = attendingRsvps.length;
  const currentRsvp = playerId
    ? event?.event_rsvp?.find((r) => r.player_id === playerId)
    : undefined;

  const deadlinePassed =
    !!event?.rsvp_deadline && new Date(event.rsvp_deadline).getTime() < Date.now();
  const isFull =
    !!event?.max_players && attendingCount >= event.max_players;

  const formattedDate = useMemo(() => {
    if (!event) return "";
    const raw = new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(parseLocalDate(event.date));
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [event, locale]);

  const eventTypeLabel = event
    ? {
        friendly_game: t("detail.eventTypeFriendly", { defaultValue: "Friendly Game" }),
        social_game: t("detail.eventTypeSocial", { defaultValue: "Social Game" }),
        training: t("detail.eventTypeTraining", { defaultValue: "Training" }),
        tournament: t("detail.eventTypeTournament", { defaultValue: "Tournament" }),
      }[event.event_type] ?? event.event_type
    : "";

  // ── Share (same URL + message the web shares) ──
  const eventUrl = `https://volleysmart.app/events/${id}`;
  const handleShare = async () => {
    const message = linkedMatchDay
      ? isPastEvent
        ? t("detail.sharePastGame", {
            url: eventUrl,
            defaultValue:
              "Look how the last Volleyball Game finished. Super interesting!\n{{url}}",
          })
        : t("detail.shareActiveGame", {
            url: eventUrl,
            defaultValue:
              "Our Volleyball game is ready! Check the teams, and track points\n{{url}}",
          })
      : t("detail.shareEvent", {
          url: eventUrl,
          defaultValue:
            "Check this Volleyball Event, and let me know if you can make it\n{{url}}",
        });
    try {
      await Share.share({ message, title: event?.title ?? "Event" });
    } catch {
      // Expo web without navigator.share: copy to clipboard instead.
      if (Platform.OS === "web" && globalThis.navigator?.clipboard) {
        await globalThis.navigator.clipboard.writeText(message);
        toast(t("detail.linkCopied", { defaultValue: "Link copied to clipboard" }));
      }
    }
  };

  // ── RSVP (also refresh the attendee list, which useRsvpMutation doesn't own) ──
  const handleRsvp = (status: RsvpStatus | null) => {
    if (!playerId || !event) return;
    rsvpMutation.mutate(
      { eventId: event.id, playerId, status },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({
            queryKey: queryKeys.events.attendees(event.id),
          }),
        onError: () =>
          toast(
            t("detail.failedToUpdateRsvp", { defaultValue: "Failed to update RSVP" }),
            "error"
          ),
      }
    );
  };

  // ── Creator menu actions ──
  const openEdit = () => {
    setMenuOpen(false);
    if (isRecurring) {
      setScopeAction("edit");
    } else {
      setEditScope("single");
      setEditOpen(true);
    }
  };
  const openCancel = () => {
    setMenuOpen(false);
    if (isRecurring) {
      setScopeAction("cancel");
    } else {
      setCancelScope("single");
      setCancelOpen(true);
    }
  };
  const openDelete = () => {
    setMenuOpen(false);
    setDeleteOpen(true);
  };

  const handleScopeSelect = (scope: EventEditScope) => {
    const action = scopeAction;
    setScopeAction(null);
    if (action === "edit") {
      setEditScope(scope);
      setEditOpen(true);
    } else if (action === "cancel") {
      setCancelScope(scope);
      setCancelOpen(true);
    }
  };

  const handleSaveEdit = (values: EventFormValues) => {
    updateMutation.mutate(
      { values, scope: editScope },
      {
        onSuccess: () => {
          setEditOpen(false);
          toast(
            editScope === "series"
              ? t("detail.allFutureEventsUpdated", {
                  defaultValue: "All future events updated",
                })
              : t("detail.eventUpdated", { defaultValue: "Event updated" })
          );
        },
        onError: () =>
          toast(
            t("detail.failedToUpdate", { defaultValue: "Failed to update event" }),
            "error"
          ),
      }
    );
  };

  const handleConfirmCancel = (reason: string, comment: string) => {
    cancelMutation.mutate(
      { reason, comment, scope: cancelScope },
      {
        onSuccess: () => {
          setCancelOpen(false);
          toast(
            cancelScope === "series"
              ? t("detail.recurringEventCancelled", {
                  defaultValue: "Recurring event cancelled",
                })
              : t("detail.eventCancelled", { defaultValue: "Event cancelled" })
          );
        },
        onError: () =>
          toast(
            t("detail.failedToCancel", { defaultValue: "Failed to cancel event" }),
            "error"
          ),
      }
    );
  };

  const handleConfirmDelete = () => {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        setDeleteOpen(false);
        toast(t("detail.eventDeleted", { defaultValue: "Event deleted" }));
        router.replace("/(tabs)/events" as never);
      },
      onError: () =>
        toast(
          t("detail.failedToDelete", { defaultValue: "Failed to delete event" }),
          "error"
        ),
    });
  };

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.events.attendees(id) }),
    ]);
  };

  const headerRight = () => (
    <View style={styles.headerActions}>
      <Pressable
        onPress={handleShare}
        accessibilityRole="button"
        hitSlop={8}
        style={styles.headerButton}
      >
        <Ionicons name={icons.share2} size={22} color={theme.primary} />
      </Pressable>
      {isCreator ? (
        <Pressable
          onPress={() => setMenuOpen(true)}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.headerButton}
        >
          <Ionicons name={icons.moreHorizontal} size={22} color={theme.primary} />
        </Pressable>
      ) : null}
    </View>
  );

  const createdDialog = (
    <Dialog
      visible={showCreatedDialog}
      onClose={() => setShowCreatedDialog(false)}
      title={t("detail.createdSuccessTitle", {
        defaultValue: "Your event was created successfully",
      })}
      message={t("detail.createdSuccessDescription", {
        defaultValue: "Modify details, share the event and get moving.",
      })}
      confirmLabel={t("detail.shareEventButton", { defaultValue: "Share event" })}
      cancelLabel={t("detail.dismiss", { defaultValue: "Dismiss" })}
      onConfirm={() => {
        setShowCreatedDialog(false);
        handleShare();
      }}
    />
  );

  if (isLoading || !event) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: "",
            headerBackTitle: t("back", { defaultValue: "Back" }),
          }}
        />
        <Screen>
          <Spinner />
        </Screen>
        {createdDialog}
      </>
    );
  }

  const parsedDate = parseLocalDate(event.date);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "short" })
    .format(parsedDate)
    .replace(".", "")
    .toUpperCase();
  const weekdayShort = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
    parsedDate
  );

  const rsvpStatusLine = currentRsvp
    ? currentRsvp.status === "attending"
      ? isPastEvent
        ? t("detail.youAttended", { defaultValue: "You Attended" })
        : t("detail.youreGoing", { defaultValue: "You're Going" })
      : t("detail.notGoing", { defaultValue: "Not Going" })
    : null;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: t("back", { defaultValue: "Back" }),
          headerTintColor: theme.primary,
          headerStyle: { backgroundColor: theme.background },
          headerRight,
        }}
      />
      <Screen onRefresh={handleRefresh}>
        {/* Date badge + own RSVP status row (matches web hero row) */}
        <View style={styles.badgeRow}>
          <View style={[styles.dateBadge, { borderColor: theme.cardBorder }]}>
            <View
              style={[
                styles.dateBadgeTop,
                { backgroundColor: isEventToday ? theme.primary : theme.danger },
              ]}
            >
              <Text style={styles.dateBadgeMonth}>
                {isEventToday
                  ? t("detail.today", { defaultValue: "Today" })
                  : monthLabel}
              </Text>
            </View>
            <View style={[styles.dateBadgeBottom, { backgroundColor: theme.card }]}>
              <Text style={[styles.dateBadgeDay, { color: theme.text }]}>
                {parsedDate.getDate()}
              </Text>
              <Text style={[styles.dateBadgeWeekday, { color: theme.mutedForeground }]}>
                {weekdayShort}
              </Text>
            </View>
          </View>
          {rsvpStatusLine ? (
            <View style={styles.rsvpStatusRow}>
              <Ionicons name={icons.user} size={16} color={theme.mutedForeground} />
              <Text style={[styles.rsvpStatusText, { color: theme.mutedForeground }]}>
                {rsvpStatusLine}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Title + chips */}
        <Text style={[styles.title, { color: theme.text }]}>{event.title}</Text>
        <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
          {formattedDate}
          {event.start_time ? ` · ${formatTime(event.start_time)}` : ""}
        </Text>
        <View style={styles.chips}>
          {isCancelled ? (
            <TintChip
              label={t("detail.eventCancelledTitle", { defaultValue: "Event Cancelled" })}
              color={theme.danger}
            />
          ) : null}
          {event.is_public ? (
            <TintChip
              icon={icons.globe}
              label={t("detail.public", { defaultValue: "Public" })}
              color={theme.accent}
            />
          ) : (
            <TintChip
              label={t("detail.clubMembersOnly", { defaultValue: "Club Members Only" })}
              color={theme.mutedForeground}
            />
          )}
          {isRecurring ? (
            <TintChip
              icon={icons.refreshCw}
              label={
                (event.recurrence_rule ?? "weekly") === "weekly"
                  ? t("detail.weekly", { defaultValue: "Weekly" })
                  : t("detail.monthly", { defaultValue: "Monthly" })
              }
              color={theme.accent}
            />
          ) : null}
          {event.is_opponent_mode ? (
            <TintChip
              icon={icons.shield}
              label={
                event.opponent_team_name
                  ? t("detail.vsOpponent", {
                      name: event.opponent_team_name,
                      defaultValue: "vs {{name}}",
                    })
                  : t("detail.opponentMode", { defaultValue: "Opponent mode" })
              }
              color={theme.warning}
            />
          ) : null}
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: theme.text }]}>
            {t("detail.details", { defaultValue: "Details" })}
          </Text>
          <View style={styles.infoList}>
            <InfoRow icon={icons.calendarDays}>
              {formattedDate}
              {event.start_time
                ? ` · ${formatTime(event.start_time)}${
                    event.end_time ? ` - ${formatTime(event.end_time)}` : ""
                  }`
                : ""}
            </InfoRow>
            {event.locations ? (
              <InfoRow icon={icons.mapPin}>
                {event.locations.name}
                {event.locations.address ? `\n${event.locations.address}` : ""}
              </InfoRow>
            ) : null}
            <InfoRow icon={icons.trophy}>{eventTypeLabel}</InfoRow>
            <InfoRow
              icon={event.activity_type === "beach" ? icons.sun : icons.building2}
            >
              {event.activity_type === "beach"
                ? t("detail.activityTypeBeach", { defaultValue: "Beach" })
                : t("detail.activityTypeIndoor", { defaultValue: "Indoor" })}
            </InfoRow>
            {event.event_gender && event.event_gender !== "mixed" ? (
              <InfoRow icon={icons.users}>
                {event.event_gender === "women_only"
                  ? t("detail.eventGenderWomenOnly", { defaultValue: "Women Only" })
                  : event.event_gender === "men_only"
                    ? t("detail.eventGenderMenOnly", { defaultValue: "Men Only" })
                    : event.event_gender === "queer"
                      ? t("detail.eventGenderQueer", { defaultValue: "Queer" })
                      : t("detail.eventGenderFlinta", { defaultValue: "Flinta" })}
              </InfoRow>
            ) : null}
            {event.max_players ? (
              <InfoRow icon={icons.user}>
                {`${attendingCount} / ${event.max_players}`}
              </InfoRow>
            ) : null}
          </View>
        </View>

        {/* Cancellation banner OR notes */}
        {isCancelled ? (
          <View
            style={[
              styles.cancelledCard,
              {
                backgroundColor: theme.warning + "1A",
                borderColor: theme.warning,
              },
            ]}
          >
            <Text style={[styles.cancelledTitle, { color: theme.text }]}>
              {t("detail.eventCancelledTitle", { defaultValue: "Event Cancelled" })}
            </Text>
            {event.cancellation_reason ? (
              <Text style={[styles.cancelledReason, { color: theme.textSecondary }]}>
                {t("detail.reason", {
                  reason: CANCELLATION_REASON_KEYS[event.cancellation_reason]
                    ? t(CANCELLATION_REASON_KEYS[event.cancellation_reason])
                    : event.cancellation_reason,
                  defaultValue: "Reason: {{reason}}",
                })}
              </Text>
            ) : null}
            {event.cancellation_comment ? (
              <Text style={[styles.cancelledComment, { color: theme.textSecondary }]}>
                {event.cancellation_comment}
              </Text>
            ) : null}
          </View>
        ) : event.notes ? (
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: theme.text }]}>
              {t("detail.descriptionNotes", { defaultValue: "Description / Notes" })}
            </Text>
            <Text style={[styles.notesText, { color: theme.text }]}>
              {event.notes}
            </Text>
          </View>
        ) : null}

        {/* Hosted by */}
        <View style={styles.sectionGap}>
          <HostedBy
            event={event}
            isCreator={isCreator}
            anonymizeCreator={event.is_public && !isCreator && !isMember}
          />
        </View>

        {/* Attendees */}
        <View style={styles.sectionGap}>
          <AttendeeList
            event={event}
            currentPlayerId={playerId}
            isCreator={isCreator}
            isMember={isMember}
          />
        </View>

        {/* Game layer (deferred on native — web-only hint rows) */}
        {(isMember || isCreator) && !isCancelled ? (
          linkedMatchDay ? (
            <DisabledGameRow
              icon={icons.trophy}
              label={t("detail.viewGameWebOnly", {
                defaultValue: "View game in the web app",
              })}
            />
          ) : !isPastEvent ? (
            <DisabledGameRow
              icon={icons.trophy}
              label={t("detail.startGameWebOnly", {
                defaultValue: "Start game (web only)",
              })}
            />
          ) : null
        ) : null}

        {/* RSVP */}
        {playerId ? (
          <View style={styles.rsvpSection}>
            <RsvpActions
              currentStatus={(currentRsvp?.status as RsvpStatus) ?? null}
              isPending={rsvpMutation.isPending}
              onRsvp={handleRsvp}
              disabled={isCancelled || isPastEvent}
              deadlinePassed={deadlinePassed}
              isFull={isFull}
            />
          </View>
        ) : null}
      </Screen>

      {/* Creator action menu */}
      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)}>
        <View style={styles.menuList}>
          {!isPastEvent ? (
            <MenuRow
              icon={icons.pencil}
              label={t("detail.editEventDropdown", { defaultValue: "Edit event" })}
              color={theme.text}
              onPress={openEdit}
            />
          ) : null}
          {!isPastEvent && !isCancelled ? (
            <MenuRow
              icon={icons.xCircle}
              label={t("detail.cancelEvent", { defaultValue: "Cancel event" })}
              color={theme.warning}
              onPress={openCancel}
            />
          ) : null}
          <MenuRow
            icon={icons.trash2}
            label={t("detail.deleteEvent", { defaultValue: "Delete event" })}
            color={theme.destructive}
            onPress={openDelete}
          />
        </View>
      </Sheet>

      {/* Recurring scope picker (before edit/cancel of recurring events) */}
      <RecurringScopeDialog
        visible={!!scopeAction}
        action={scopeAction ?? "edit"}
        onClose={() => setScopeAction(null)}
        onSelect={handleScopeSelect}
      />

      {/* Edit sheet */}
      <EditEventSheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        event={event}
        onSave={handleSaveEdit}
        saving={updateMutation.isPending}
      />

      {/* Cancel dialog (reason + comment) */}
      <CancelEventDialog
        visible={cancelOpen}
        onClose={() => setCancelOpen(false)}
        loading={cancelMutation.isPending}
        onConfirm={handleConfirmCancel}
      />

      {/* Delete confirmation */}
      <Dialog
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t("detail.deleteDialogTitle", { defaultValue: "Delete event" })}
        message={t("detail.deleteDialogDescription", {
          title: event.title,
          defaultValue:
            'Are you sure you want to delete "{{title}}"? This action cannot be undone.',
        })}
        confirmLabel={t("detail.delete", { defaultValue: "Delete" })}
        cancelLabel={t("detail.cancel", { defaultValue: "Cancel" })}
        destructive
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />

      {createdDialog}
    </>
  );
}

function InfoRow({
  icon,
  children,
}: {
  icon: IoniconsName;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={theme.textSecondary} />
      <Text style={[styles.infoText, { color: theme.text }]}>{children}</Text>
    </View>
  );
}

function TintChip({
  label,
  color,
  icon,
}: {
  label: string;
  color: string;
  icon?: IoniconsName;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: color + "1A" }]}>
      {icon ? <Ionicons name={icon} size={12} color={color} /> : null}
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

function DisabledGameRow({
  icon,
  label,
}: {
  icon: IoniconsName;
  label: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.gameRow,
        { borderColor: theme.cardBorder, backgroundColor: theme.muted },
      ]}
    >
      <Ionicons name={icon} size={18} color={theme.mutedForeground} />
      <Text style={[styles.gameRowText, { color: theme.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  color,
  onPress,
}: {
  icon: IoniconsName;
  label: string;
  color: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.menuRow,
        pressed && { backgroundColor: theme.surface },
      ]}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.menuRowText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: "row", gap: spacing.sm },
  headerButton: { padding: spacing.xs },

  badgeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  dateBadge: {
    width: 64,
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  dateBadgeTop: { paddingVertical: 3, alignItems: "center" },
  dateBadgeMonth: {
    ...typography.label,
    color: palette.white,
    textTransform: "uppercase",
  },
  dateBadgeBottom: { alignItems: "center", paddingVertical: 6 },
  dateBadgeDay: { fontSize: 24, fontWeight: "700", lineHeight: 26 },
  dateBadgeWeekday: { ...typography.caption },
  rsvpStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: spacing.xs,
  },
  rsvpStatusText: { ...typography.bodySm },

  title: { ...typography.h1, marginTop: spacing.xl },
  subtitle: { ...typography.bodySm, marginTop: spacing.xs },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  chipText: { ...typography.label },

  section: { marginTop: spacing.xxl, gap: spacing.md },
  sectionGap: { marginTop: spacing.xxl },
  sectionHeader: { ...typography.h3 },
  infoList: { gap: spacing.md },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  infoText: { ...typography.body, flex: 1 },

  cancelledCard: {
    marginTop: spacing.xxl,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cancelledTitle: { ...typography.h3 },
  cancelledReason: { ...typography.bodySm, fontWeight: "600" },
  cancelledComment: { ...typography.bodySm },

  notesText: { ...typography.body, lineHeight: 22 },

  gameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xxl,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    opacity: 0.7,
  },
  gameRowText: { ...typography.bodySm, fontWeight: "600" },

  rsvpSection: { marginTop: spacing.xxl },

  menuList: { paddingBottom: spacing.md },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  menuRowText: { ...typography.body, fontWeight: "500" },
});
