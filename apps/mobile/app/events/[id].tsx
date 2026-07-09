import { useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { type RsvpStatus } from "@volleysmart/core";
import { AttendeeList } from "@/components/events/AttendeeList";
import { CancelEventDialog } from "@/components/events/CancelEventDialog";
import { EditEventSheet } from "@/components/events/EditEventSheet";
import type { EventFormValues } from "@/components/events/form/EventFormFields";
import { HostedBy } from "@/components/events/HostedBy";
import { RecurringScopeDialog } from "@/components/events/RecurringScopeDialog";
import { Dialog } from "@/components/ui/Dialog";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
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
  const insets = useSafeAreaInsets();
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
  const [rsvpMenuOpen, setRsvpMenuOpen] = useState(false);
  const [showCreatedDialog, setShowCreatedDialog] = useState(
    created === "true" || created === "1"
  );

  // The creator menu is an RN Modal (Sheet); opening the edit sheet / scope
  // dialog while it is still dismissing freezes iOS. So the menu rows only
  // record the intent and it runs from Sheet.onClosed, once the menu is gone.
  const pendingMenuActionRef = useRef<null | "edit" | "cancel" | "delete">(null);

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
        try {
          await globalThis.navigator.clipboard.writeText(message);
          toast(t("detail.linkCopied", { defaultValue: "Link copied to clipboard" }));
        } catch {
          // Clipboard permission denied: surface the link instead of crashing.
          toast(eventUrl);
        }
      }
    }
  };

  // ── RSVP (useRsvpMutation also invalidates the attendee list) ──
  const handleRsvp = (status: RsvpStatus | null) => {
    if (!playerId || !event) return;
    rsvpMutation.mutate(
      { eventId: event.id, playerId, status },
      {
        onError: () =>
          toast(
            t("detail.failedToUpdateRsvp", { defaultValue: "Failed to update RSVP" }),
            "error"
          ),
      }
    );
  };

  // ── Creator menu actions (deferred until the menu Sheet fully closes) ──
  const requestMenuAction = (action: "edit" | "cancel" | "delete") => {
    pendingMenuActionRef.current = action;
    setMenuOpen(false);
  };
  const handleMenuClosed = () => {
    const action = pendingMenuActionRef.current;
    pendingMenuActionRef.current = null;
    if (action === "edit") {
      if (isRecurring) {
        setScopeAction("edit");
      } else {
        setEditScope("single");
        setEditOpen(true);
      }
    } else if (action === "cancel") {
      if (isRecurring) {
        setScopeAction("cancel");
      } else {
        setCancelScope("single");
        setCancelOpen(true);
      }
    } else if (action === "delete") {
      setDeleteOpen(true);
    }
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
        router.replace("/(tabs)/events");
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
        style={[styles.headerButton, { backgroundColor: theme.background + "99" }]}
      >
        <Ionicons name={icons.shareSocial} size={20} color={theme.primary} />
      </Pressable>
      {isCreator ? (
        <Pressable
          onPress={() => setMenuOpen(true)}
          accessibilityRole="button"
          hitSlop={8}
          style={[styles.headerButton, { backgroundColor: theme.background + "99" }]}
        >
          <Ionicons name={icons.moreHorizontal} size={20} color={theme.primary} />
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
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="" />
        <Screen safeTop={false}>
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

  const showBottomBar = !!playerId || isMember || isCreator;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Gradient hero behind the header (matches web from-primary/30 → bg) */}
      <LinearGradient
        colors={[theme.primary + "4D", theme.primary + "1A", theme.background]}
        locations={[0, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={[styles.heroGradient, { height: insets.top + 210 }]}
        pointerEvents="none"
      />
      <ScreenHeader title="" right={headerRight()} transparent borderless />
      <Screen
        safeTop={false}
        onRefresh={handleRefresh}
        contentStyle={showBottomBar ? styles.scrollWithBar : undefined}
      >
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
              icon={icons.repeat}
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
              <View style={styles.infoRow}>
                <Ionicons
                  name={icons.mapPin}
                  size={17}
                  color={theme.textSecondary}
                />
                <View style={styles.infoTextGroup}>
                  <Text style={[styles.locationName, { color: theme.text }]}>
                    {event.locations.name}
                  </Text>
                  {event.locations.address ? (
                    <Text
                      style={[
                        styles.locationAddress,
                        { color: theme.mutedForeground },
                      ]}
                    >
                      {event.locations.address}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}
            <EventTypeRow eventType={event.event_type} label={eventTypeLabel} />
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

      </Screen>

      {/* Sticky bottom bar: RSVP dropdown + Start/View game (matches web) */}
      {showBottomBar ? (
        <>
          {rsvpMenuOpen ? (
            <Pressable
              style={styles.rsvpMenuBackdrop}
              onPress={() => setRsvpMenuOpen(false)}
            />
          ) : null}
          <View
            style={[
              styles.bottomBar,
              {
                backgroundColor: theme.card,
                borderTopColor: theme.border,
                paddingBottom: insets.bottom + spacing.md,
              },
            ]}
          >
            {/* RSVP dropdown popup (opens upward) */}
            {rsvpMenuOpen ? (
              <View
                style={[
                  styles.rsvpMenu,
                  { backgroundColor: theme.card, borderColor: theme.cardBorder },
                ]}
              >
                <RsvpMenuItem
                  label={t("detail.rsvpGoing", { defaultValue: "Going" })}
                  onPress={() => {
                    setRsvpMenuOpen(false);
                    handleRsvp("attending");
                  }}
                />
                <RsvpMenuItem
                  label={t("detail.rsvpNotGoing", { defaultValue: "Not Going" })}
                  onPress={() => {
                    setRsvpMenuOpen(false);
                    handleRsvp("declined");
                  }}
                />
                {currentRsvp ? (
                  <RsvpMenuItem
                    label={t("detail.cancelRsvp", {
                      defaultValue: "Cancel RSVP",
                    })}
                    muted
                    onPress={() => {
                      setRsvpMenuOpen(false);
                      handleRsvp(null);
                    }}
                  />
                ) : null}
              </View>
            ) : null}

            <View style={styles.bottomRow}>
              {playerId ? (
                <RsvpButton
                  status={(currentRsvp?.status as RsvpStatus) ?? null}
                  disabled={
                    isCancelled ||
                    isPastEvent ||
                    deadlinePassed ||
                    rsvpMutation.isPending
                  }
                  showChevron={!isPastEvent}
                  onPress={() => setRsvpMenuOpen((o) => !o)}
                />
              ) : null}

              {(isMember || isCreator) && !isCancelled ? (
                <View style={styles.gameButtonWrap}>
                  <DisabledGameRow
                    icon={icons.trophy}
                    label={
                      linkedMatchDay
                        ? t("detail.viewGameWebOnly", {
                            defaultValue: "View game (web only)",
                          })
                        : t("detail.startGameWebOnly", {
                            defaultValue: "Start game (web only)",
                          })
                    }
                  />
                </View>
              ) : null}
            </View>
          </View>
        </>
      ) : null}

      {/* Creator action menu */}
      <Sheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onClosed={handleMenuClosed}
      >
        <View style={styles.menuList}>
          {!isPastEvent ? (
            <MenuRow
              icon={icons.pencil}
              label={t("detail.editEventDropdown", { defaultValue: "Edit event" })}
              color={theme.text}
              onPress={() => requestMenuAction("edit")}
            />
          ) : null}
          {!isPastEvent && !isCancelled ? (
            <MenuRow
              icon={icons.xCircle}
              label={t("detail.cancelEvent", { defaultValue: "Cancel event" })}
              color={theme.warning}
              onPress={() => requestMenuAction("cancel")}
            />
          ) : null}
          <MenuRow
            icon={icons.trash2}
            label={t("detail.deleteEvent", { defaultValue: "Delete event" })}
            color={theme.destructive}
            onPress={() => requestMenuAction("delete")}
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
    </View>
  );
}

const RSVP_GREEN = "#16a34a";
const RSVP_RED = "#dc2626";

function RsvpButton({
  status,
  disabled,
  showChevron,
  onPress,
}: {
  status: RsvpStatus | null;
  disabled: boolean;
  showChevron: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation("events");

  const bg =
    status === "attending"
      ? RSVP_GREEN
      : status === "declined"
        ? RSVP_RED
        : theme.secondary;
  const fg = status ? "#ffffff" : theme.secondaryForeground;
  const label =
    status === "attending"
      ? t("detail.rsvpGoing", { defaultValue: "Going" })
      : status === "declined"
        ? t("detail.rsvpNotGoing", { defaultValue: "Not Going" })
        : t("detail.rsvp", { defaultValue: "RSVP" });

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.rsvpButton,
        { backgroundColor: bg },
        disabled && { opacity: 0.5 },
        pressed && !disabled && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.rsvpButtonText, { color: fg }]}>{label}</Text>
      {showChevron ? (
        <Ionicons name={icons.chevronDown} size={16} color={fg} />
      ) : null}
    </Pressable>
  );
}

function RsvpMenuItem({
  label,
  onPress,
  muted,
}: {
  label: string;
  onPress: () => void;
  muted?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.rsvpMenuItem,
        pressed && { backgroundColor: theme.surface },
      ]}
    >
      <Text
        style={[
          styles.rsvpMenuItemText,
          { color: muted ? theme.mutedForeground : theme.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
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
      <Ionicons name={icon} size={17} color={theme.textSecondary} />
      <Text style={[styles.infoText, { color: theme.text }]}>{children}</Text>
    </View>
  );
}

/** Event-type row with a per-type icon (crossed swords for friendly, to
 *  match the PWA / Create-event step, instead of the tournament trophy). */
function EventTypeRow({
  eventType,
  label,
}: {
  eventType: string;
  label: string;
}) {
  const theme = useTheme();
  const color = theme.textSecondary;
  const iconEl =
    eventType === "friendly_game" ? (
      <MaterialCommunityIcons name="sword-cross" size={17} color={color} />
    ) : eventType === "social_game" ? (
      <Ionicons name={icons.users} size={17} color={color} />
    ) : eventType === "training" ? (
      <Ionicons name={icons.dumbbell} size={17} color={color} />
    ) : (
      <Ionicons name={icons.trophy} size={17} color={color} />
    );
  return (
    <View style={styles.infoRow}>
      {iconEl}
      <Text style={[styles.infoText, { color: theme.text }]}>{label}</Text>
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
  heroGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  scrollWithBar: { paddingBottom: 120 },

  headerActions: { flexDirection: "row", gap: spacing.sm },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

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

  section: { marginTop: spacing.xxxl, gap: spacing.md },
  sectionGap: { marginTop: spacing.xxxl },
  sectionHeader: { ...typography.h3 },
  infoList: { gap: spacing.lg },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  infoText: { ...typography.body, fontSize: 14, flex: 1, lineHeight: 20 },
  infoTextGroup: { flex: 1, gap: 1 },
  locationName: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  locationAddress: { fontSize: 14, lineHeight: 19 },

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
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    opacity: 0.7,
  },
  gameRowText: { ...typography.bodySm, fontWeight: "600" },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    zIndex: 50,
    elevation: 24,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rsvpButton: {
    width: 140,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radii.md,
  },
  rsvpButtonText: { fontSize: 15, fontWeight: "600" },
  gameButtonWrap: { flex: 1 },
  rsvpMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    elevation: 20,
  },
  rsvpMenu: {
    position: "absolute",
    left: spacing.lg,
    bottom: "100%",
    marginBottom: spacing.sm,
    minWidth: 180,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.xs,
    // float above the bar and the scroll content
    zIndex: 60,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 32,
  },
  rsvpMenuItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rsvpMenuItemText: { fontSize: 15, fontWeight: "500" },

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
