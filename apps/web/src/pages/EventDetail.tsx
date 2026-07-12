import * as React from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isToday, isBefore, startOfDay, addDays, differenceInCalendarDays } from "date-fns";
import { getDateLocale } from "@/lib/dateLocale";
import {
  ArrowLeft,
  MoreHorizontal,
  CalendarIcon,
  MapPin,
  Pencil,
  Trash2,
  ChevronDown,
  User,
  CalendarCheck,
  Share2,
  Swords,
  Users,
  Dumbbell,
  Trophy,
  Eye,
  EyeOff,
  XCircle,
  Repeat,
  MessageCircle,
  Globe,
  Building,
  Palmtree,
  Shield,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Linkify } from "@/lib/linkify";
import { useIsCompact } from "@/hooks/use-compact";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchSingleEvent,
  deletePlannedEvent,
  cancelPlannedEvent,
  cancelRecurringSeries,
  upsertRsvp,
  deleteRsvp,
  updatePlannedEvent,
  updateRecurringSeries,
  fetchOpponentTeamNames,
  type PlannedEvent,
  type RsvpStatus,
  type EventType,
  type UpdateEventInput,
} from "@/integrations/supabase/plannedEvents";
import { EventLocationSelector } from "@/components/forms/EventLocationSelector";
import {
  GuestNameSelector,
  type GuestSummary,
} from "@/components/forms/GuestNameSelector";
import {
  createOrReuseGuestByName,
  getLastPositionForPlayerInClub,
} from "@/integrations/supabase/players";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { assignTeams } from "@/features/teams/assignLineup";
import type { PlayerForTeams } from "@/features/teams/assignLineup";
import { normalizeRole } from "@/features/teams/positions";
import { formatShortName } from "@/lib/formatName";
import { fetchUserClubIds } from "@/integrations/supabase/clubMembers";

// ─── Event type display config ──────────────────────────────────────────────
const EVENT_TYPE_CONFIG: Record<
  string,
  { labelKey: string; Icon: React.FC<{ className?: string }> }
> = {
  friendly_game: { labelKey: "detail.eventTypeFriendly", Icon: Swords },
  social_game: { labelKey: "detail.eventTypeSocial", Icon: Users },
  training: { labelKey: "detail.eventTypeTraining", Icon: Dumbbell },
  tournament: { labelKey: "detail.eventTypeTournament", Icon: Trophy },
};

const EVENT_TYPE_OPTIONS: { value: EventType; labelKey: string }[] = [
  { value: "friendly_game", labelKey: "detail.eventTypeFriendly" },
  { value: "social_game", labelKey: "detail.eventTypeSocial" },
  { value: "training", labelKey: "detail.eventTypeTraining" },
  { value: "tournament", labelKey: "detail.eventTypeTournament" },
];

// ─── RSVP attendee with profile info ─────────────────────────────────────────
interface Attendee {
  player_id: string;
  status: RsvpStatus;
  first_name: string;
  last_name: string;
  image_url: string | null;
  primary_position: string | null;
}

// ─── Edit Event Sheet ────────────────────────────────────────────────────────
interface EditEventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: PlannedEvent;
  onSave: (input: UpdateEventInput) => void;
  saving: boolean;
}

const EditEventSheet: React.FC<EditEventSheetProps> = ({
  open,
  onOpenChange,
  event,
  onSave,
  saving,
}) => {
  const { t } = useTranslation("events");
  const isCompact = useIsCompact();
  const [title, setTitle] = React.useState(event.title);
  const [eventType, setEventType] = React.useState<EventType>(
    event.event_type
  );
  const [date, setDate] = React.useState(event.date);
  const [startTime, setStartTime] = React.useState(
    event.start_time?.slice(0, 5) ?? "18:00"
  );
  const [endTime, setEndTime] = React.useState(
    event.end_time?.slice(0, 5) ?? "20:00"
  );
  const [locationId, setLocationId] = React.useState<string | null>(
    event.location_id
  );
  const [isPublic, setIsPublic] = React.useState(event.is_public);
  const [maxPlayers, setMaxPlayers] = React.useState(
    event.max_players?.toString() ?? ""
  );
  const [notes, setNotes] = React.useState(event.notes ?? "");
  const [eventGender, setEventGender] = React.useState(event.event_gender ?? "mixed");
  const [activityType, setActivityType] = React.useState(event.activity_type ?? "indoor");
  const [isOpponentMode, setIsOpponentMode] = React.useState(event.is_opponent_mode ?? false);
  const [opponentTeamName, setOpponentTeamName] = React.useState(event.opponent_team_name ?? "");
  const { data: opponentNameSuggestions = [] } = useQuery({
    queryKey: ["opponent-names", event.club_id],
    queryFn: () => fetchOpponentTeamNames(event.club_id!),
    enabled: !!event.club_id && isOpponentMode,
    staleTime: 5 * 60 * 1000,
  });
  const RSVP_PRESETS = [
    { labelKey: "create.rsvpSameDay", days: 0 },
    { labelKey: "create.rsvp1DayBefore", days: 1 },
    { labelKey: "create.rsvp3DaysBefore", days: 3 },
    { labelKey: "create.rsvp1WeekBefore", days: 7 },
    { labelKey: "create.rsvpCustom", days: null as number | null },
  ];

  function detectPreset(eventDate: string, deadlineStr: string | null): number | null {
    if (!deadlineStr) return 1;
    const evDate = parseISO(eventDate);
    const dlDate = parseISO(deadlineStr);
    const diff = differenceInCalendarDays(evDate, dlDate);
    const idx = RSVP_PRESETS.findIndex((p) => p.days === diff);
    return idx >= 0 && idx < RSVP_PRESETS.length - 1 ? idx : null;
  }

  const [rsvpPreset, setRsvpPreset] = React.useState<number | null>(
    detectPreset(event.date, event.rsvp_deadline)
  );
  const [rsvpCustomDate, setRsvpCustomDate] = React.useState(
    event.rsvp_deadline ? event.rsvp_deadline.slice(0, 10) : ""
  );

  // Reset form when event changes or sheet opens
  React.useEffect(() => {
    if (open) {
      setTitle(event.title);
      setEventType(event.event_type);
      setDate(event.date);
      setStartTime(event.start_time?.slice(0, 5) ?? "18:00");
      setEndTime(event.end_time?.slice(0, 5) ?? "20:00");
      setLocationId(event.location_id);
      setIsPublic(event.is_public);
      setMaxPlayers(event.max_players?.toString() ?? "");
      setNotes(event.notes ?? "");
      setEventGender(event.event_gender ?? "mixed");
      setActivityType(event.activity_type ?? "indoor");
      setIsOpponentMode(event.is_opponent_mode ?? false);
      setOpponentTeamName(event.opponent_team_name ?? "");
      setRsvpPreset(detectPreset(event.date, event.rsvp_deadline));
      setRsvpCustomDate(event.rsvp_deadline ? event.rsvp_deadline.slice(0, 10) : "");
    }
  }, [open, event]);

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error(t("detail.eventNameRequired"));
      return;
    }
    onSave({
      title: title.trim(),
      event_type: eventType,
      date,
      start_time: startTime,
      end_time: endTime,
      location_id: locationId,
      is_public: isPublic,
      max_players: maxPlayers ? parseInt(maxPlayers, 10) : null,
      notes: notes.trim() || null,
      event_gender: eventGender,
      activity_type: activityType,
      is_opponent_mode: isOpponentMode,
      opponent_team_name: opponentTeamName.trim() || null,
      rsvp_deadline: (() => {
        if (rsvpPreset !== null && rsvpPreset < RSVP_PRESETS.length - 1) {
          const days = RSVP_PRESETS[rsvpPreset].days;
          if (days !== null) {
            const dl = addDays(parseISO(date), -days);
            dl.setHours(23, 59, 0, 0);
            return dl.toISOString();
          }
        }
        return rsvpCustomDate ? `${rsvpCustomDate}T23:59:59` : null;
      })(),
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isCompact ? "bottom" : "right"} className="h-[95dvh] flex flex-col p-0 overflow-x-hidden">
        <SheetHeader className="px-4 pt-4 pb-2 border-b">
          <SheetTitle>{t("detail.editEvent")}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-5">
          {/* Event Name */}
          <div className="space-y-1.5">
            <Label>{t("detail.eventName")}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("detail.eventNamePlaceholder")}
            />
          </div>

          {/* Event Type */}
          <div className="space-y-1.5">
            <Label>{t("detail.eventType")}</Label>
            <Select
              value={eventType}
              onValueChange={(v) => setEventType(v as EventType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const cfg = EVENT_TYPE_CONFIG[opt.value];
                        return cfg ? <cfg.Icon className="h-4 w-4" /> : null;
                      })()}
                      {t(opt.labelKey)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-1.5 overflow-hidden max-w-full">
            <Label>{t("detail.date")}</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full max-w-full appearance-none"
              style={{ boxSizing: 'border-box' }}
            />
          </div>

          {/* Start + End time */}
          <div className="grid grid-cols-2 gap-3 overflow-hidden max-w-full">
            <div className="space-y-1.5 overflow-hidden min-w-0">
              <Label>{t("detail.startTime")}</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full max-w-full appearance-none"
                style={{ boxSizing: 'border-box' }}
              />
            </div>
            <div className="space-y-1.5 overflow-hidden min-w-0">
              <Label>{t("detail.endTime")}</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full max-w-full appearance-none"
                style={{ boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* RSVP Deadline */}
          <div className="space-y-1.5">
            <Label>{t("create.rsvpDeadline")}</Label>
            <Select
              value={rsvpPreset !== null ? String(rsvpPreset) : "custom"}
              onValueChange={(v) => {
                if (v === "custom") {
                  setRsvpPreset(null);
                } else {
                  setRsvpPreset(Number(v));
                }
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RSVP_PRESETS.map((p, i) => (
                  <SelectItem key={i} value={p.days !== null ? String(i) : "custom"}>
                    {t(p.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {rsvpPreset === null && (
              <Input
                type="date"
                value={rsvpCustomDate}
                onChange={(e) => setRsvpCustomDate(e.target.value)}
                className="mt-1.5 w-full max-w-full appearance-none"
                style={{ boxSizing: 'border-box' }}
              />
            )}
          </div>

          {/* Location */}
          <EventLocationSelector
            clubId={event.club_id}
            value={locationId}
            onValueChange={setLocationId}
          />

          {/* Max Players */}
          <div className="space-y-1.5">
            <Label>{t("detail.maxPlayers")}</Label>
            <Input
              type="number"
              min="2"
              max="100"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              placeholder={t("detail.maxPlayersPlaceholder")}
            />
          </div>

          {/* Visibility */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isPublic ? (
                <Eye className="h-4 w-4 text-muted-foreground" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {isPublic ? t("detail.publicEvent") : t("detail.clubMembersOnly")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPublic
                    ? t("detail.anyoneCanSee")
                    : t("detail.onlyMembersCanSee")}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPublic(!isPublic)}
            >
              {isPublic ? t("detail.makePrivate") : t("detail.makePublic")}
            </Button>
          </div>

          {/* Event Gender + Activity Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("detail.eventGender")}</Label>
              <Select value={eventGender} onValueChange={(v) => setEventGender(v as typeof eventGender)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mixed">{t("detail.eventGenderMixed")}</SelectItem>
                  <SelectItem value="women_only">{t("detail.eventGenderWomenOnly")}</SelectItem>
                  <SelectItem value="men_only">{t("detail.eventGenderMenOnly")}</SelectItem>
                  <SelectItem value="queer">{t("detail.eventGenderQueer")}</SelectItem>
                  <SelectItem value="flinta">{t("detail.eventGenderFlinta")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("detail.activityType")}</Label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setActivityType("indoor")}
                  className={cn("flex-1 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                    activityType === "indoor" ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted")}>
                  <Building className="h-4 w-4" />{t("detail.activityTypeIndoor")}
                </button>
                <button type="button" onClick={() => setActivityType("beach")}
                  className={cn("flex-1 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                    activityType === "beach" ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted")}>
                  <Palmtree className="h-4 w-4" />{t("detail.activityTypeBeach")}
                </button>
              </div>
            </div>
          </div>

          {/* Opponent Mode — only for game-type events with a club */}
          {eventType !== "training" && event.club_id && (
            <div className="space-y-2 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{t("create.opponentMode")}</p>
                    <p className="text-xs text-muted-foreground">{t("create.opponentModeDesc")}</p>
                  </div>
                </div>
                <Switch checked={isOpponentMode} onCheckedChange={setIsOpponentMode} />
              </div>
              {isOpponentMode && (
                <>
                  <Input
                    placeholder={t("create.opponentTeamNamePlaceholder")}
                    value={opponentTeamName}
                    onChange={(e) => setOpponentTeamName(e.target.value)}
                    list="edit-opponent-name-suggestions"
                    className="mt-2"
                  />
                  {opponentNameSuggestions.length > 0 && (
                    <datalist id="edit-opponent-name-suggestions">
                      {opponentNameSuggestions.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  )}
                </>
              )}
            </div>
          )}

          {/* Description / Notes */}
          <div className="space-y-1.5">
            <Label>{t("detail.descriptionNotesLabel")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => {
                if (e.target.value.length <= 100) setNotes(e.target.value);
              }}
              maxLength={100}
              placeholder={t("detail.descriptionNotesPlaceholder")}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {notes.length}/100
            </p>
          </div>
        </div>

        {/* Fixed Save button */}
        <div className="px-4 py-3 border-t pb-[max(env(safe-area-inset-bottom),12px)]">
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
          >
            {saving ? t("detail.saving") : t("detail.save")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ─── Main page ───────────────────────────────────────────────────────────────
const CANCELLATION_REASON_KEYS: Record<string, string> = {
  "Not enough players": "detail.reasonNotEnoughPlayers",
  "Bad weather": "detail.reasonBadWeather",
  "Venue unavailable": "detail.reasonVenueUnavailable",
  "Scheduling conflict": "detail.reasonSchedulingConflict",
  "Other": "detail.reasonOther",
};

const EventDetail: React.FC = () => {
  const { t } = useTranslation("events");
  const { t: tProfile } = useTranslation("profile");
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isCompact = useIsCompact();

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [editSheetOpen, setEditSheetOpen] = React.useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [cancelComment, setCancelComment] = React.useState("");
  const [recurrenceScopeAction, setRecurrenceScopeAction] = React.useState<"cancel" | "edit" | null>(null);
  const [cancelSeries, setCancelSeries] = React.useState(false);
  const [editSeries, setEditSeries] = React.useState(false);
  const [showCreatedDialog, setShowCreatedDialog] = React.useState(
    searchParams.get("created") === "true"
  );

  // Fetch event
  const {
    data: event,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => fetchSingleEvent(eventId!),
    enabled: !!eventId,
  });

  // Fetch current user's player record
  const { data: currentPlayer } = useQuery({
    queryKey: ["current-player", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("players")
        .select("id, first_name, last_name, image_url, player_positions(is_primary, positions(name))")
        .eq("user_id", user.id)
        .single();
      if (!data) return null;
      const primaryPos = ((data as any).player_positions ?? []).find(
        (pp: any) => pp.is_primary
      );
      return {
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        image_url: data.image_url,
        primary_position: primaryPos?.positions?.name ?? null,
      };
    },
    enabled: !!user?.id,
  });

  // Fetch creator profile
  const { data: creatorProfile } = useQuery({
    queryKey: ["creator-profile", event?.created_by],
    queryFn: async () => {
      if (!event?.created_by) return null;
      const { data } = await supabase
        .from("players")
        .select("first_name, last_name, image_url")
        .eq("user_id", event.created_by)
        .maybeSingle();
      return data;
    },
    enabled: !!event?.created_by,
  });

  // Fetch club member count
  const { data: memberCount } = useQuery({
    queryKey: ["club_member_count", event?.club_id],
    queryFn: async () => {
      if (!event?.club_id) return 0;
      const { count, error: err } = await supabase
        .from("club_members")
        .select("*", { count: "exact", head: true })
        .eq("club_id", event.club_id)
        .eq("is_active", true)
        .eq("status", "active");
      if (err) return 0;
      return count ?? 0;
    },
    enabled: !!event?.club_id,
  });

  // Fetch user's club IDs (for membership check on public events)
  const { data: userClubIds = [] } = useQuery({
    queryKey: ["user-club-ids", user?.id],
    queryFn: () => fetchUserClubIds(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch attendee profiles (players who RSVPed), ordered by RSVP time
  const attendingRsvps =
    event?.event_rsvp?.filter((r) => r.status === "attending") ?? [];
  const attendingPlayerIds = attendingRsvps.map((r) => r.player_id);

  // Build a map of player_id → responded_at for sorting
  const rsvpTimeMap = new Map(
    attendingRsvps.map((r) => [r.player_id, r.responded_at ?? ""])
  );

  const { data: attendees = [] } = useQuery({
    queryKey: ["event-attendees", eventId, attendingPlayerIds],
    queryFn: async (): Promise<Attendee[]> => {
      if (!attendingPlayerIds.length) return [];

      // Try RPC first (works for organizer + club members, returns empty for others)
      const { data: rpcRows } = await supabase.rpc("get_event_attendees", {
        p_event_id: eventId,
      });

      if (rpcRows && rpcRows.length > 0) {
        return (rpcRows as any[]).map((r) => ({
          player_id: r.player_id,
          status: "attending" as RsvpStatus,
          first_name: r.first_name,
          last_name: r.last_name,
          image_url: r.image_url,
          primary_position: r.primary_position ?? null,
        }));
      }

      // Fallback: direct query (works for club members via existing RLS)
      const { data: players } = await supabase
        .from("players")
        .select(
          `id, first_name, last_name, image_url,
           player_positions(is_primary, positions(name))`
        )
        .in("id", attendingPlayerIds);

      const mapped = (players ?? []).map((p: any) => {
        const primaryPos = (p.player_positions ?? []).find(
          (pp: any) => pp.is_primary
        );
        return {
          player_id: p.id,
          status: "attending" as RsvpStatus,
          first_name: p.first_name,
          last_name: p.last_name,
          image_url: p.image_url,
          primary_position: primaryPos?.positions?.name ?? null,
        };
      });

      // Sort by RSVP time (earliest first)
      mapped.sort((a, b) => {
        const tA = rsvpTimeMap.get(a.player_id) ?? "";
        const tB = rsvpTimeMap.get(b.player_id) ?? "";
        return tA.localeCompare(tB);
      });

      return mapped;
    },
    enabled: attendingPlayerIds.length > 0,
  });

  // RSVP mutation
  const rsvpMutation = useMutation({
    mutationFn: async (status: RsvpStatus) => {
      if (!currentPlayer?.id || !eventId) throw new Error("Missing data");
      await upsertRsvp(eventId, currentPlayer.id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-attendees", eventId] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
    },
    onError: () => toast.error(t("detail.failedToUpdateRsvp")),
  });

  const cancelRsvpMutation = useMutation({
    mutationFn: async () => {
      if (!currentPlayer?.id || !eventId) throw new Error("Missing data");
      await deleteRsvp(eventId, currentPlayer.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-attendees", eventId] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
    },
    onError: () => toast.error(t("detail.failedToCancelRsvp")),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (input: UpdateEventInput) => {
      if (editSeries && recurringParentId) {
        return updateRecurringSeries(recurringParentId, input);
      }
      return updatePlannedEvent(eventId!, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
      setEditSheetOpen(false);
      setEditSeries(false);
      toast.success(editSeries ? t("detail.allFutureEventsUpdated") : t("detail.eventUpdated"));
    },
    onError: () => toast.error(t("detail.failedToUpdate")),
  });

  const isRecurring = !!(event?.recurrence_rule || event?.recurrence_parent_id);
  const recurringParentId = event?.recurrence_parent_id ?? event?.id;

  // Cancel mutation (sets status to 'cancelled', notifies members)
  const cancelMutation = useMutation({
    mutationFn: () => {
      if (cancelSeries && recurringParentId) {
        return cancelRecurringSeries(recurringParentId, cancelReason, cancelComment);
      }
      return cancelPlannedEvent(eventId!, cancelReason, cancelComment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      setCancelDialogOpen(false);
      setCancelReason("");
      setCancelComment("");
      setCancelSeries(false);
      toast.success(cancelSeries ? t("detail.recurringEventCancelled") : t("detail.eventCancelled"));
    },
    onError: () => toast.error(t("detail.failedToCancel")),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => deletePlannedEvent(eventId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
      toast.success(t("detail.eventDeleted"));
      navigate("/events");
    },
    onError: () => toast.error(t("detail.failedToDelete")),
  });

  // Check if a game already exists for this event
  const { data: linkedMatchDay } = useQuery({
    queryKey: ["event-match-day", eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const { data } = await supabase
        .from("match_days")
        .select("id" as unknown as string)
        .eq("planned_event_id" as any, eventId)
        .maybeSingle();
      return data as { id: string } | null;
    },
    enabled: !!eventId,
  });

  const [isStartingGame, setIsStartingGame] = React.useState(false);
  // Player/guest selection step shown before teams are generated
  const [selectSheetOpen, setSelectSheetOpen] = React.useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = React.useState<string[]>([]);
  type GameGuest = { id: string; name: string; existingPlayerId: string | null };
  const [gameGuests, setGameGuests] = React.useState<GameGuest[]>([]);
  const [clubVsClubDialog, setClubVsClubDialog] = React.useState<{
    clubAName: string;
    clubBName: string;
    clubAPlayerIds: string[];
    clubBPlayerIds: string[];
    allPlayersData: any[];
  } | null>(null);

  const createMatchDay = async (
    gamePlayers: { player_id: string; team_name: string; position_played: string }[],
    opponentClubName?: string,
  ) => {
    const { data: matchDay, error: mdError } = await supabase
      .from("match_days")
      .insert({
        date: event!.date,
        created_by: user!.id,
        club_id: event!.club_id,
        team_generated: true,
        location_id: event!.location_id,
        planned_event_id: eventId,
        ...(opponentClubName ? { is_opponent_mode: true, opponent_team_name: opponentClubName } : {}),
      } as any)
      .select()
      .single();

    if (mdError) throw mdError;

    const matches = Array.from({ length: 5 }, (_, i) => ({
      match_day_id: matchDay.id,
      game_number: i + 1,
      team_a_score: 0,
      team_b_score: 0,
      added_by_user_id: user!.id,
    }));
    const { error: mError } = await supabase.from("matches").insert(matches).select();
    if (mError) throw mError;

    const allGamePlayers = gamePlayers.map((gp) => ({
      match_day_id: matchDay.id,
      player_id: gp.player_id,
      team_name: gp.team_name,
      original_team_name: gp.team_name,
      manually_adjusted: false,
      position_played: gp.position_played,
    }));

    const { error: gpError } = await supabase.from("game_players").insert(allGamePlayers);
    if (gpError) throw gpError;

    return matchDay;
  };

  const startClubVsClub = async () => {
    if (!clubVsClubDialog || !event) return;
    setIsStartingGame(true);
    setClubVsClubDialog(null);
    try {
      const gamePlayers = clubVsClubDialog.allPlayersData.map((p: any) => {
        const primary = (p.player_positions ?? []).find((pp: any) => pp.is_primary);
        const team = clubVsClubDialog.clubAPlayerIds.includes(p.id) ? "team_a" : "team_b";
        return {
          player_id: p.id,
          team_name: team,
          position_played: normalizeRole(primary?.positions?.name),
        };
      });
      const matchDay = await createMatchDay(gamePlayers, clubVsClubDialog.clubBName);
      toast.success(t("detail.gameStarted"));
      navigate(`/game/${matchDay.id}`);
    } catch (error) {
      console.error("Error starting club vs club game:", error);
      toast.error(t("detail.failedToStartGame"));
    } finally {
      setIsStartingGame(false);
    }
  };

  const startNormalGame = async (playersData: any[]) => {
    if (!event || !user?.id || !eventId) return;
    const playersForTeams: PlayerForTeams[] = playersData.map(
      (p: any) => {
        const positions = p.player_positions ?? [];
        const primary = positions.find((pp: any) => pp.is_primary);
        const secondaries = positions
          .filter((pp: any) => !pp.is_primary && pp.positions?.name)
          .map((pp: any) => normalizeRole(pp.positions.name));
        return {
          id: p.id,
          score: p.skill_rating ?? 50,
          mainPosition: normalizeRole(primary?.positions?.name),
          secondaryPositions: secondaries,
          gender: p.gender ?? null,
          name: p.first_name ?? null,
        };
      }
    );

    const teamAssignment = assignTeams(playersForTeams);
    const gamePlayers = [
      ...teamAssignment.teamA,
      ...teamAssignment.teamB,
    ].map((ap) => ({
      player_id: ap.id,
      team_name: ap.team,
      position_played: ap.assignedPosition,
    }));

    const matchDay = await createMatchDay(gamePlayers);

    toast.success(t("detail.gameStarted"));
    navigate(`/game/${matchDay.id}`);
  };

  // Step 1: open the "select players + add guests" sheet, pre-selecting all
  // attending players. Teams are generated only after the user confirms.
  const minGamePlayers = event?.is_opponent_mode ? 2 : 4;

  const handleStartGame = () => {
    if (!event || !user?.id || !eventId) return;

    const attending = attendees.filter((a) => a.status === "attending");
    if (attending.length < minGamePlayers) {
      toast.error(t("detail.minPlayersNeeded"));
      return;
    }

    setSelectedPlayerIds(attending.map((a) => a.player_id));
    setGameGuests([]);
    setSelectSheetOpen(true);
  };

  // Step 2: resolve the selected attendees + guests, then generate teams.
  const handleConfirmStartGame = async () => {
    if (!event || !user?.id || !eventId) return;

    const namedGuests = gameGuests.filter((g) => g.name.trim());
    const totalSelected = selectedPlayerIds.length + namedGuests.length;
    if (totalSelected < minGamePlayers) {
      toast.error(t("detail.selectMinPlayers", { count: minGamePlayers }));
      return;
    }

    setSelectSheetOpen(false);
    setIsStartingGame(true);
    try {
      const { data: rpcData } = await supabase.rpc("get_game_start_players", { p_event_id: eventId });

      const selectedSet = new Set(selectedPlayerIds);
      const selectedPlayersData = (rpcData ?? [])
        .filter((p: any) => selectedSet.has(p.player_id))
        .map((p: any) => ({
          id: p.player_id,
          first_name: p.first_name ?? null,
          skill_rating: p.skill_rating,
          user_id: p.user_id,
          gender: p.gender ?? null,
          player_positions: ((p.positions ?? []) as any[]).map((pos: any) => ({
            is_primary: pos.is_primary,
            positions: { name: pos.name },
          })),
          club_memberships: p.club_memberships ?? [],
        }));

      // Resolve guests: create/reuse a player record, reuse last-played position.
      const resolvedGuests = await Promise.all(
        namedGuests.map(async (g) => {
          let guestPlayerId: string;
          if (g.existingPlayerId) {
            guestPlayerId = g.existingPlayerId;
          } else {
            const firstName = g.name.trim().replace(/\s+/g, "") || "Guest";
            const guestPlayer = await createOrReuseGuestByName(
              event.club_id!,
              firstName,
              "Player"
            );
            guestPlayerId = guestPlayer.id;
          }
          const lastPos = event.club_id
            ? await getLastPositionForPlayerInClub(event.club_id, guestPlayerId)
            : null;
          return {
            id: guestPlayerId,
            first_name: g.name.trim(),
            skill_rating: 5,
            user_id: null,
            gender: null,
            player_positions: [
              { is_primary: true, positions: { name: lastPos ?? "Outside Hitter" } },
            ],
            // Guests belong to the host club so club-vs-club keeps them on team A.
            club_memberships: event.club_id
              ? [{ club_id: event.club_id, club_name: event.clubs?.name ?? null }]
              : [],
          };
        })
      );

      // Drop guests that resolved to an already-selected attendee.
      const existingIds = new Set(selectedPlayersData.map((p: any) => p.id));
      const uniqueGuests = resolvedGuests.filter((g) => !existingIds.has(g.id));

      const playersData = [...selectedPlayersData, ...uniqueGuests];

      await proceedWithGame(playersData);
    } catch (error) {
      console.error("Error starting game:", error);
      toast.error(t("detail.failedToStartGame"));
      setIsStartingGame(false);
    }
  };

  // Step 3: generate teams for the resolved player list. Assumes
  // isStartingGame is already true; owns clearing it.
  const proceedWithGame = async (playersData: any[]) => {
    if (!event || !user?.id || !eventId) return;
    try {
      if (event.is_opponent_mode) {
        // Opponent mode: all attending players → team_a
        const { data: matchDay, error: mdError } = await supabase
          .from("match_days")
          .insert({
            date: event.date,
            created_by: user.id,
            club_id: event.club_id,
            team_generated: true,
            location_id: event.location_id,
            planned_event_id: eventId,
            is_opponent_mode: true,
            opponent_team_name: event.opponent_team_name ?? null,
          } as any)
          .select()
          .single();

        if (mdError) throw mdError;

        const matches = Array.from({ length: 5 }, (_, i) => ({
          match_day_id: matchDay.id,
          game_number: i + 1,
          team_a_score: 0,
          team_b_score: 0,
          added_by_user_id: user.id,
        }));
        const { error: mError } = await supabase.from("matches").insert(matches).select();
        if (mError) throw mError;

        const gamePlayers = playersData.map((p: any) => {
          const primary = (p.player_positions ?? []).find((pp: any) => pp.is_primary);
          return {
            match_day_id: matchDay.id,
            player_id: p.id,
            team_name: "team_a",
            original_team_name: "team_a",
            manually_adjusted: false,
            position_played: normalizeRole(primary?.positions?.name),
          };
        });

        const { error: gpError } = await supabase.from("game_players").insert(gamePlayers);
        if (gpError) throw gpError;

        toast.success(t("detail.gameStarted"));
        navigate(`/game/${matchDay.id}`);
      } else {
        // Check for Club vs Club eligibility
        if (event.club_id) {
          const hostClubPlayerIds: string[] = [];
          const clubPlayerMap = new Map<string, { name: string; playerIds: string[] }>();

          for (const p of playersData) {
            for (const m of p.club_memberships as any[]) {
              if (m.club_id === event.club_id) {
                if (!hostClubPlayerIds.includes(p.id)) {
                  hostClubPlayerIds.push(p.id);
                }
              } else {
                if (!clubPlayerMap.has(m.club_id)) {
                  clubPlayerMap.set(m.club_id, { name: m.club_name ?? m.club_id, playerIds: [] });
                }
                if (!clubPlayerMap.get(m.club_id)!.playerIds.includes(p.id)) {
                  clubPlayerMap.get(m.club_id)!.playerIds.push(p.id);
                }
              }
            }
          }

          const eligibleClubs = [...clubPlayerMap.entries()].filter(([, v]) => v.playerIds.length >= 4);
          if (eligibleClubs.length === 1 && hostClubPlayerIds.length >= 4) {
            const opponentPlayerIds = [...eligibleClubs[0][1].playerIds];

            // Balance dual-member players: move from larger team to smaller
            const dualMembers = hostClubPlayerIds.filter(id => opponentPlayerIds.includes(id));
            for (const dualId of dualMembers) {
              if (hostClubPlayerIds.length <= opponentPlayerIds.length) break;
              const idx = hostClubPlayerIds.indexOf(dualId);
              if (idx !== -1) hostClubPlayerIds.splice(idx, 1);
            }
            const hostSet = new Set(hostClubPlayerIds);
            const finalOpponentIds = opponentPlayerIds.filter(id => !hostSet.has(id));

            setIsStartingGame(false);
            setClubVsClubDialog({
              clubAName: event.clubs?.name ?? t("detail.hostClub"),
              clubBName: eligibleClubs[0][1].name,
              clubAPlayerIds: hostClubPlayerIds,
              clubBPlayerIds: finalOpponentIds,
              allPlayersData: playersData,
            });
            return;
          }
        }

        // Normal team assignment
        await startNormalGame(playersData);
      }
    } catch (error) {
      console.error("Error starting game:", error);
      toast.error(t("detail.failedToStartGame"));
    } finally {
      setIsStartingGame(false);
    }
  };

  const eventUrl = window.location.href.split("?")[0];
  const eventDateParsed = event?.date ? parseISO(event.date) : null;
  const isEventPast = eventDateParsed ? isBefore(eventDateParsed, startOfDay(new Date())) : false;
  const shareMessage = linkedMatchDay
    ? isEventPast
      ? t("detail.sharePastGame", { url: eventUrl })
      : t("detail.shareActiveGame", { url: eventUrl })
    : t("detail.shareEvent", { url: eventUrl });

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: event?.title ?? "Event", text: shareMessage });
    } else {
      navigator.clipboard.writeText(shareMessage);
      toast.success(t("detail.linkCopied"));
    }
  };

  // Render the success dialog even during loading so it's visible immediately
  const createdDialog = (
    <Dialog
      open={showCreatedDialog}
      onOpenChange={(open) => {
        if (!open) {
          setShowCreatedDialog(false);
          searchParams.delete("created");
          setSearchParams(searchParams, { replace: true });
        }
      }}
    >
      <DialogContent className="max-w-sm mx-auto rounded-2xl">
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div className="rounded-xl bg-muted p-4">
            <CalendarCheck className="h-10 w-10" />
          </div>
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl">
              {t("detail.createdSuccessTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("detail.createdSuccessDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 w-full mt-2">
            <Button
              className="w-full gap-2"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
              {t("detail.shareEventButton")}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowCreatedDialog(false);
                searchParams.delete("created");
                setSearchParams(searchParams, { replace: true });
              }}
            >
              {t("detail.dismiss")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">{t("detail.loadingEvent")}</p>
        {createdDialog}
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">{t("detail.eventNotFound")}</p>
        <Button variant="outline" onClick={() => navigate("/events")}>
          {t("detail.goHome")}
        </Button>
        {createdDialog}
      </div>
    );
  }

  const isCreator = event.created_by === user?.id;
  const currentRsvp = event.event_rsvp?.find(
    (r) => r.player_id === currentPlayer?.id
  );
  const isAttending = currentRsvp?.status === "attending";
  const parsedDate = parseISO(event.date);
  const isEventToday = isToday(parsedDate);
  const isPastEvent = isBefore(parsedDate, startOfDay(new Date()));
  const rawDate = format(parsedDate, "EEEE, d MMMM yyyy", { locale: getDateLocale() });
  const formattedDate = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);
  const startTime = event.start_time?.slice(0, 5); // HH:MM
  const endTime = event.end_time?.slice(0, 5);
  const attendingCount = attendingPlayerIds.length;

  const rsvpLabel = currentRsvp
    ? currentRsvp.status === "attending"
      ? isPastEvent ? t("detail.attended") : t("detail.going")
      : t("detail.notGoing")
    : t("detail.rsvp");

  const typeConfig = EVENT_TYPE_CONFIG[event.event_type];

  const creatorName = creatorProfile
    ? formatShortName(creatorProfile.first_name, creatorProfile.last_name)
    : t("detail.unknown");
  const isMember = event.club_id
    ? userClubIds.includes(event.club_id)
    : false;
  const hasRsvped = !!currentRsvp;
  const isPublicNonMember = event.is_public && !isCreator && !isMember;

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      {/* Gradient hero */}
      <div className="relative h-32 bg-gradient-to-br from-primary/30 via-primary/10 to-background">
        {/* Top bar overlay */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),16px)]">
          <button
            onClick={() => navigate("/events")}
            className="p-2 rounded-full bg-background/60 backdrop-blur-sm hover:bg-background/80"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 rounded-full bg-background/60 backdrop-blur-sm hover:bg-background/80"
              title={t("detail.shareEventButton")}
            >
              <Share2 className="h-5 w-5" />
            </button>
            {isCreator && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-full bg-background/60 backdrop-blur-sm hover:bg-background/80">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  {!isPastEvent && (
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={() => {
                        if (isRecurring) {
                          setRecurrenceScopeAction("edit");
                        } else {
                          setEditSheetOpen(true);
                        }
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      {t("detail.editEventDropdown")}
                    </DropdownMenuItem>
                  )}
                  {!isPastEvent && event.status !== "cancelled" && (
                    <DropdownMenuItem
                      className="gap-2 text-amber-600 focus:text-amber-600"
                      onClick={() => {
                        if (isRecurring) {
                          setRecurrenceScopeAction("cancel");
                        } else {
                          setCancelDialogOpen(true);
                        }
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                      {t("detail.cancelEvent")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="gap-2 text-destructive focus:text-destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("detail.deleteEvent")}
                  </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-12 max-w-2xl mx-auto w-full space-y-8 z-50">
        {/* Date badge + RSVP status row */}
        <div className="flex items-end justify-between">
          {/* Calendar badge — blue if today, red otherwise (matches Events overview) */}
          <div className="w-16 rounded-lg overflow-hidden shadow-md border border-border">
            <div className={`${isToday(parsedDate) ? "bg-primary" : "bg-[#EB534C]"} text-white text-center py-1`}>
              <span className="text-xs font-semibold uppercase">
                {isToday(parsedDate) ? t("detail.today") : format(parsedDate, "MMM", { locale: getDateLocale() })}
              </span>
            </div>
            <div className="bg-white dark:bg-card text-foreground text-center py-1.5">
              <span className="text-2xl font-bold leading-none block">
                {format(parsedDate, "d", { locale: getDateLocale() })}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(parsedDate, "EEE", { locale: getDateLocale() })}
              </span>
            </div>
          </div>
          {currentRsvp && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground pb-1">
              <User className="h-4 w-4" />
              {currentRsvp.status === "attending"
                ? isPastEvent ? t("detail.youAttended") : t("detail.youreGoing")
                : t("detail.notGoing")}
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {formattedDate} at {startTime}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {event.is_public ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                <Globe className="h-3 w-3" />
                {t("detail.public")}
              </span>
            ) : (
              <span className="inline-block text-xs font-medium bg-muted px-2 py-0.5 rounded">
                {t("detail.clubMembersOnly")}
              </span>
            )}
            {isRecurring && (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                <Repeat className="h-3 w-3" />
                {(event.recurrence_rule ?? "weekly") === "weekly" ? t("detail.weekly") : t("detail.monthly")}
              </span>
            )}
            {event.is_opponent_mode && (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded">
                <Shield className="h-3 w-3" />
                {event.opponent_team_name ? t("detail.vsOpponent", { name: event.opponent_team_name }) : t("detail.opponentMode")}
              </span>
            )}
          </div>
        </div>

        {/* Details section */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">{t("detail.details")}</h2>

          {/* Date + time */}
          <div className="flex items-start gap-3">
            <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
            <p className="text-sm">
              {formattedDate}
              {startTime && (
                <>
                  {" "}
                  at {startTime}
                  {endTime && ` - ${endTime}`}
                </>
              )}
            </p>
          </div>

          {/* Location */}
          {event.locations && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">{event.locations.name}</p>
                {event.locations.address && (
                  <p className="text-sm text-muted-foreground">
                    {event.locations.address}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Event type */}
          <div className="flex items-center gap-3">
            {typeConfig ? (
              <typeConfig.Icon className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Swords className="h-5 w-5 text-muted-foreground" />
            )}
            <p className="text-sm">
              {typeConfig ? t(typeConfig.labelKey) : event.event_type}
            </p>
          </div>

          {/* Activity type */}
          <div className="flex items-center gap-3">
            {event.activity_type === "beach" ? (
              <Palmtree className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Building className="h-5 w-5 text-muted-foreground" />
            )}
            <p className="text-sm">
              {t(`detail.activityType${event.activity_type === "beach" ? "Beach" : "Indoor"}`)}
            </p>
          </div>

          {/* Event gender */}
          {event.event_gender && event.event_gender !== "mixed" && (
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm">
                {t(`detail.eventGender${
                  event.event_gender === "women_only" ? "WomenOnly"
                  : event.event_gender === "queer" ? "Queer"
                  : event.event_gender === "flinta" ? "Flinta"
                  : "MenOnly"
                }`)}
              </p>
            </div>
          )}

        </div>

        {/* Cancellation block OR Description / Notes */}
        {event.status === "cancelled" ? (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 space-y-1">
            <h2 className="text-lg font-bold text-amber-800 dark:text-amber-300">{t("detail.eventCancelledTitle")}</h2>
            {event.cancellation_reason && (
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {t("detail.reason", { reason: CANCELLATION_REASON_KEYS[event.cancellation_reason] ? t(CANCELLATION_REASON_KEYS[event.cancellation_reason]) : event.cancellation_reason })}
              </p>
            )}
            {event.cancellation_comment && (
              <p className="text-sm text-amber-600 dark:text-amber-400">{event.cancellation_comment}</p>
            )}
          </div>
        ) : event.notes ? (
          <div className="space-y-2">
            <h2 className="text-lg font-bold">{t("detail.descriptionNotes")}</h2>
            <p className="text-sm"><Linkify>{event.notes}</Linkify></p>
          </div>
        ) : null}

        {/* Hosted by section */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold">{t("detail.hostedBy")}</h2>
          <div className="rounded-xl border shadow-sm overflow-hidden">
            {/* Club row — always show when event has a club */}
            {event.clubs && (
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/clubs/${event.clubs!.id}`)}
              >
                {event.clubs.image_url ? (
                  <img
                    src={event.clubs.image_url}
                    alt=""
                    className="h-12 w-12 rounded-lg object-cover bg-muted"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-semibold">{event.clubs.name}</p>
                  {memberCount !== undefined && memberCount > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {t("detail.memberCount", { count: memberCount })}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Separator between club and creator */}
            {event.clubs && <div className="border-t mx-4" />}

            {/* Creator row */}
            <div className="flex items-center gap-3 px-4 py-3">
              {!isPublicNonMember && creatorProfile?.image_url ? (
                <img
                  src={creatorProfile.image_url}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover bg-muted"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "/avatar-placeholder.svg";
                  }}
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{creatorName}</p>
                <p className="text-sm text-muted-foreground">{t("detail.organizer")}</p>
              </div>
              {!isCreator && (
                <button
                  type="button"
                  disabled
                  className="h-9 w-9 flex items-center justify-center rounded-full border opacity-40 cursor-not-allowed"
                  aria-label="Chat with organizer (coming soon)"
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RSVP section */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold">{t("detail.countGoing", { count: attendingCount })}</h2>
          {(() => {
            // Not RSVPed or declined → prompt to RSVP (public non-members)
            if (isPublicNonMember && !isAttending) {
              return (
                <p className="text-sm text-muted-foreground">{t("detail.rsvpToSee")}</p>
              );
            }

            // Public event, non-organizer (including club members) → anonymized + own row
            if (event.is_public && !isCreator) {
              if (attendingCount === 0) {
                return <p className="text-sm text-muted-foreground">{t("detail.noResponsesYet")}</p>;
              }
              // Show own row (real data) + anonymized rows for others
              const isCurrentPlayerAttending = isAttending && currentPlayer;
              const othersCount = attendingCount - (isCurrentPlayerAttending ? 1 : 0);
              return (
                <div className="space-y-2">
                  {/* Current user's own row with real data */}
                  {isCurrentPlayerAttending && (
                    <div className="flex items-center gap-3">
                      {currentPlayer.image_url ? (
                        <img
                          src={currentPlayer.image_url}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/avatar-placeholder.svg";
                          }}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {currentPlayer.first_name} {currentPlayer.last_name?.charAt(0)}.
                        </p>
                        {currentPlayer.primary_position && (
                          <p className="text-xs text-muted-foreground">
                            {tProfile(`positions.name.${currentPlayer.primary_position}`, { defaultValue: currentPlayer.primary_position })}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{t("detail.you")}</span>
                    </div>
                  )}
                  {/* Anonymized rows for other attendees */}
                  {Array.from({ length: othersCount }).map((_, i) => (
                    <div key={`anon-${i}`} className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t("detail.playerN", { n: i + 1 })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            }

            // Private/club event — full attendee list (organizer or member)
            if (attendees.length > 0 || attendingCount > 0) {
              return (
                <div className="space-y-2">
                  {attendees.map((a) => (
                    <div key={a.player_id} className="flex items-center gap-3">
                      {a.image_url ? (
                        <img
                          src={a.image_url}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/avatar-placeholder.svg";
                          }}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {a.first_name} {a.last_name?.charAt(0)}.
                        </p>
                        {a.primary_position && (
                          <p className="text-xs text-muted-foreground">
                            {tProfile(`positions.name.${a.primary_position}`, { defaultValue: a.primary_position })}
                          </p>
                        )}
                      </div>
                      {a.player_id === currentPlayer?.id && (
                        <span className="text-xs text-muted-foreground shrink-0">{t("detail.you")}</span>
                      )}
                    </div>
                  ))}
                  {/* Placeholder rows for attendees not visible via RLS */}
                  {Array.from({ length: Math.max(0, attendingCount - attendees.length) }).map((_, i) => (
                    <div key={`placeholder-${i}`} className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t("detail.playerN", { n: attendees.length + i + 1 })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            }

            return <p className="text-sm text-muted-foreground">{t("detail.noResponsesYet")}</p>;
          })()}
        </div>
      </div>

      {/* Fixed bottom bar: RSVP dropdown + Start Game */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3 bg-white dark:bg-card border-t pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                className={cn(
                  "gap-1.5 w-[140px] justify-center",
                  currentRsvp?.status === "attending" &&
                    "bg-green-600 hover:bg-green-700 text-white",
                  currentRsvp?.status === "declined" &&
                    "bg-red-600 hover:bg-red-700 text-white"
                )}
                disabled={rsvpMutation.isPending || cancelRsvpMutation.isPending || event.status === "cancelled" || isPastEvent}
              >
                {rsvpLabel}
                {!isPastEvent && <ChevronDown className="h-4 w-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                className="gap-2"
                onClick={() => rsvpMutation.mutate("attending")}
              >
                {t("detail.rsvpGoing")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2"
                onClick={() => rsvpMutation.mutate("declined")}
              >
                {t("detail.rsvpNotGoing")}
              </DropdownMenuItem>
              {currentRsvp && (
                <DropdownMenuItem
                  className="gap-2 text-muted-foreground"
                  onClick={() => cancelRsvpMutation.mutate()}
                >
                  {t("detail.cancelRsvp")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Start Game / View Game — visible to all club members */}
          {(isMember || isCreator) && linkedMatchDay ? (
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => navigate(`/game/${linkedMatchDay.id}`)}
              disabled={event.status === "cancelled"}
            >
              {t("detail.viewGame")}
            </Button>
          ) : (isMember || isCreator) ? (
            <Button
              className="flex-1"
              onClick={handleStartGame}
              disabled={!isEventToday || isStartingGame || event.status === "cancelled" || attendees.filter((a) => a.status === "attending").length < (event.is_opponent_mode ? 2 : 4)}
            >
              {isStartingGame ? t("detail.starting") : t("detail.startGame")}
            </Button>
          ) : null}
        </div>
      </div>

      {createdDialog}

      {/* Edit event sheet */}
      {event && (
        <EditEventSheet
          open={editSheetOpen}
          onOpenChange={setEditSheetOpen}
          event={event}
          onSave={(input) => updateMutation.mutate(input)}
          saving={updateMutation.isPending}
        />
      )}

      {/* Select players + add guests sheet (shown before teams are generated) */}
      <Sheet open={selectSheetOpen} onOpenChange={setSelectSheetOpen}>
        <SheetContent
          side={isCompact ? "bottom" : "right"}
          className="h-[95dvh] flex flex-col p-0 overflow-x-hidden"
        >
          <SheetHeader className="px-4 pt-4 pb-2 border-b">
            <SheetTitle>{t("detail.selectPlayersTitle")}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-5">
            <p className="text-sm text-muted-foreground">
              {t("detail.selectPlayersSubtitle")}
            </p>

            {/* Attending players */}
            <div className="space-y-2">
              {attendees
                .filter((a) => a.status === "attending")
                .map((a) => {
                  const checked = selectedPlayerIds.includes(a.player_id);
                  return (
                    <button
                      type="button"
                      key={a.player_id}
                      onClick={() =>
                        setSelectedPlayerIds((cur) =>
                          cur.includes(a.player_id)
                            ? cur.filter((id) => id !== a.player_id)
                            : [...cur, a.player_id]
                        )
                      }
                      className={cn(
                        "w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                        checked
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted"
                      )}
                    >
                      <Checkbox checked={checked} className="pointer-events-none" />
                      {a.image_url ? (
                        <img
                          src={a.image_url}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/avatar-placeholder.svg";
                          }}
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {a.first_name} {a.last_name?.charAt(0)}.
                        </p>
                        {a.primary_position && (
                          <p className="text-xs text-muted-foreground truncate">
                            {tProfile(`positions.name.${a.primary_position}`, {
                              defaultValue: a.primary_position,
                            })}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>

            {/* Guests */}
            {event.club_id && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">{t("detail.guests")}</h3>
                {gameGuests.map((g) => (
                  <div key={g.id} className="flex items-center gap-2">
                    <GuestNameSelector
                      clubId={event.club_id!}
                      value={g.name}
                      placeholder={t("detail.guestNamePlaceholder")}
                      onValueChange={(v) =>
                        setGameGuests((cur) =>
                          cur.map((x) =>
                            x.id === g.id
                              ? { ...x, name: v.replace(/\s+/g, ""), existingPlayerId: null }
                              : x
                          )
                        )
                      }
                      onExistingGuestSelected={(guest: GuestSummary) =>
                        setGameGuests((cur) =>
                          cur.map((x) =>
                            x.id === g.id
                              ? {
                                  ...x,
                                  name: guest.first_name.replace(/\s+/g, ""),
                                  existingPlayerId: guest.player_id,
                                }
                              : x
                          )
                        )
                      }
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      aria-label={t("detail.removeGuest")}
                      onClick={() =>
                        setGameGuests((cur) => cur.filter((x) => x.id !== g.id))
                      }
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() =>
                    setGameGuests((cur) => [
                      ...cur,
                      {
                        id: `guest-${Date.now()}-${Math.random()}`,
                        name: "",
                        existingPlayerId: null,
                      },
                    ])
                  }
                >
                  <UserPlus className="h-4 w-4" />
                  {t("detail.addGuest")}
                </Button>
              </div>
            )}
          </div>

          {/* Fixed confirm button */}
          <div className="px-4 py-3 border-t pb-[max(env(safe-area-inset-bottom),12px)]">
            <p className="text-xs text-muted-foreground mb-2 text-center">
              {t("detail.playersSelectedCount", {
                count:
                  selectedPlayerIds.length +
                  gameGuests.filter((g) => g.name.trim()).length,
              })}
            </p>
            <Button
              className="w-full"
              onClick={handleConfirmStartGame}
              disabled={
                isStartingGame ||
                selectedPlayerIds.length +
                  gameGuests.filter((g) => g.name.trim()).length <
                  minGamePlayers
              }
            >
              {isStartingGame ? t("detail.starting") : t("detail.generateTeams")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Club vs Club dialog */}
      <Dialog open={!!clubVsClubDialog} onOpenChange={(open) => { if (!open) setClubVsClubDialog(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t("detail.clubVsClubTitle")}</DialogTitle>
            <DialogDescription>
              {t("detail.clubVsClubDescription", {
                clubA: clubVsClubDialog?.clubAName ?? "",
                countA: clubVsClubDialog?.clubAPlayerIds.length ?? 0,
                clubB: clubVsClubDialog?.clubBName ?? "",
                countB: clubVsClubDialog?.clubBPlayerIds.length ?? 0,
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            <Button onClick={startClubVsClub}>
              {t("detail.clubVsClubYes", {
                clubA: clubVsClubDialog?.clubAName ?? "",
                clubB: clubVsClubDialog?.clubBName ?? "",
              })}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const data = clubVsClubDialog?.allPlayersData;
                setClubVsClubDialog(null);
                if (data) {
                  setIsStartingGame(true);
                  try {
                    await startNormalGame(data);
                  } catch {
                    toast.error(t("detail.failedToStartGame"));
                  } finally {
                    setIsStartingGame(false);
                  }
                }
              }}
            >
              {t("detail.clubVsClubNo")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel event dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={(open) => {
        setCancelDialogOpen(open);
        if (!open) { setCancelReason(""); setCancelComment(""); }
      }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t("detail.cancelDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("detail.cancelDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Select value={cancelReason} onValueChange={setCancelReason}>
              <SelectTrigger>
                <SelectValue placeholder={t("detail.selectReason")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Not enough players">{t("detail.reasonNotEnoughPlayers")}</SelectItem>
                <SelectItem value="Bad weather">{t("detail.reasonBadWeather")}</SelectItem>
                <SelectItem value="Venue unavailable">{t("detail.reasonVenueUnavailable")}</SelectItem>
                <SelectItem value="Scheduling conflict">{t("detail.reasonSchedulingConflict")}</SelectItem>
                <SelectItem value="Other">{t("detail.reasonOther")}</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder={cancelReason === "Other" ? t("detail.cancelCommentOtherPlaceholder") : t("detail.cancelCommentPlaceholder")}
              value={cancelComment}
              onChange={(e) => setCancelComment(e.target.value)}
              maxLength={200}
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setCancelDialogOpen(false)}
              >
                {t("detail.back")}
              </Button>
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                disabled={!cancelReason || (cancelReason === "Other" && !cancelComment.trim()) || cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
              >
                {cancelMutation.isPending ? t("detail.cancelling") : t("detail.cancelEventButton")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recurrence scope dialog (Apple Calendar style) */}
      <Dialog open={!!recurrenceScopeAction} onOpenChange={() => setRecurrenceScopeAction(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {recurrenceScopeAction === "cancel" ? t("detail.cancelRecurringTitle") : t("detail.editRecurringTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => {
                if (recurrenceScopeAction === "cancel") {
                  setCancelSeries(false);
                  setCancelDialogOpen(true);
                } else {
                  setEditSeries(false);
                  setEditSheetOpen(true);
                }
                setRecurrenceScopeAction(null);
              }}
            >
              {t("detail.thisEventOnly")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (recurrenceScopeAction === "cancel") {
                  setCancelSeries(true);
                  setCancelDialogOpen(true);
                } else {
                  setEditSeries(true);
                  setEditSheetOpen(true);
                }
                setRecurrenceScopeAction(null);
              }}
            >
              {t("detail.thisAndAllFuture")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t("detail.deleteDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("detail.deleteDialogDescription", { title: event.title })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteDialogOpen(false)}
            >
              {t("detail.cancel")}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? t("detail.deleting") : t("detail.delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventDetail;
