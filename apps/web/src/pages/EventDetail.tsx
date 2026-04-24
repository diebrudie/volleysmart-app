import * as React from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isToday, isBefore, startOfDay } from "date-fns";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { useIsCompact } from "@/hooks/use-compact";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchSingleEvent,
  deletePlannedEvent,
  cancelPlannedEvent,
  cancelRecurringSeries,
  upsertRsvp,
  updatePlannedEvent,
  updateRecurringSeries,
  type PlannedEvent,
  type RsvpStatus,
  type EventType,
  type UpdateEventInput,
} from "@/integrations/supabase/plannedEvents";
import { EventLocationSelector } from "@/components/forms/EventLocationSelector";
import { toast } from "sonner";
import { assignTeams } from "@/features/teams/assignLineup";
import type { PlayerForTeams } from "@/features/teams/assignLineup";
import { normalizeRole } from "@/features/teams/positions";
import { format } from "date-fns";

// ─── Event type display config ──────────────────────────────────────────────
const EVENT_TYPE_CONFIG: Record<
  string,
  { label: string; Icon: React.FC<{ className?: string }> }
> = {
  friendly_game: { label: "Friendly Game", Icon: Swords },
  social_game: { label: "Social Game", Icon: Users },
  training: { label: "Training", Icon: Dumbbell },
  tournament: { label: "Tournament", Icon: Trophy },
};

const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: "friendly_game", label: "Friendly Game" },
  { value: "social_game", label: "Social Game" },
  { value: "training", label: "Training" },
  { value: "tournament", label: "Tournament" },
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
    }
  }, [open, event]);

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("Event name is required");
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
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isCompact ? "bottom" : "right"} className="h-[95dvh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b">
          <SheetTitle>Edit Event</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Event Name */}
          <div className="space-y-1.5">
            <Label>Event Name</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event name"
            />
          </div>

          {/* Event Type */}
          <div className="space-y-1.5">
            <Label>Event Type</Label>
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
                      {opt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Start + End time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>End Time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Location */}
          <EventLocationSelector
            clubId={event.club_id}
            value={locationId}
            onValueChange={setLocationId}
          />

          {/* Max Players */}
          <div className="space-y-1.5">
            <Label>Max Players</Label>
            <Input
              type="number"
              min="2"
              max="100"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              placeholder="No limit"
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
                  {isPublic ? "Public Event" : "Club Members Only"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPublic
                    ? "Anyone can see this event"
                    : "Only club members can see this"}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPublic(!isPublic)}
            >
              {isPublic ? "Make Private" : "Make Public"}
            </Button>
          </div>

          {/* Description / Notes */}
          <div className="space-y-1.5">
            <Label>Description / Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => {
                if (e.target.value.length <= 100) setNotes(e.target.value);
              }}
              maxLength={100}
              placeholder="Add a description or notes..."
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
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ─── Main page ───────────────────────────────────────────────────────────────
const EventDetail: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
        .select("id")
        .eq("user_id", user.id)
        .single();
      return data;
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
    onError: () => toast.error("Failed to update RSVP"),
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
      toast.success(editSeries ? "All future events updated" : "Event updated");
    },
    onError: () => toast.error("Failed to update event"),
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
      toast.success(cancelSeries ? "Recurring event cancelled" : "Event cancelled");
    },
    onError: () => toast.error("Failed to cancel event"),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => deletePlannedEvent(eventId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
      toast.success("Event deleted");
      navigate("/events");
    },
    onError: () => toast.error("Failed to delete event"),
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

  const handleStartGame = async () => {
    if (!event || !user?.id || !eventId) return;

    const attending = attendees.filter((a) => a.status === "attending");
    if (attending.length < 4) {
      toast.error("At least 4 attending players are needed to start a game");
      return;
    }

    setIsStartingGame(true);
    try {
      // Fetch full player data for team assignment (skill_rating + positions)
      const playerIds = attending.map((a) => a.player_id);
      const { data: playersData } = await supabase
        .from("players")
        .select(
          `id, skill_rating,
           player_positions(is_primary, positions(name))`
        )
        .in("id", playerIds);

      // Build PlayerForTeams array
      const playersForTeams: PlayerForTeams[] = (playersData ?? []).map(
        (p: any) => {
          const positions = p.player_positions ?? [];
          const primary = positions.find((pp: any) => pp.is_primary);
          const secondary = positions.find((pp: any) => !pp.is_primary);
          return {
            id: p.id,
            score: p.skill_rating ?? 50,
            mainPosition: normalizeRole(primary?.positions?.name),
            secondaryPosition: secondary?.positions?.name
              ? normalizeRole(secondary.positions.name)
              : null,
          };
        }
      );

      // Generate teams
      const teamAssignment = assignTeams(playersForTeams);

      // Create match_day linked to this event
      const { data: matchDay, error: mdError } = await supabase
        .from("match_days")
        .insert({
          date: event.date,
          created_by: user.id,
          club_id: event.club_id,
          team_generated: true,
          location_id: event.location_id,
          planned_event_id: eventId,
        } as any)
        .select()
        .single();

      if (mdError) throw mdError;

      // Create 5 matches (sets)
      const matches = Array.from({ length: 5 }, (_, i) => ({
        match_day_id: matchDay.id,
        game_number: i + 1,
        team_a_score: 0,
        team_b_score: 0,
        added_by_user_id: user.id,
      }));
      const { error: mError } = await supabase
        .from("matches")
        .insert(matches)
        .select();
      if (mError) throw mError;

      // Create game_players from team assignment
      const allGamePlayers = [
        ...teamAssignment.teamA,
        ...teamAssignment.teamB,
      ].map((ap) => ({
        match_day_id: matchDay.id,
        player_id: ap.id,
        team_name: ap.team,
        original_team_name: ap.team,
        manually_adjusted: false,
        position_played: ap.assignedPosition,
      }));

      const { error: gpError } = await supabase
        .from("game_players")
        .insert(allGamePlayers);
      if (gpError) throw gpError;

      const compromiseNote =
        teamAssignment.compromises.length > 0
          ? ` Note: ${teamAssignment.compromises.join("; ")}`
          : "";
      toast.success(`Game started!${compromiseNote}`);

      navigate(`/game/${matchDay.id}`);
    } catch (error) {
      console.error("Error starting game:", error);
      toast.error("Failed to start game. Please try again.");
    } finally {
      setIsStartingGame(false);
    }
  };

  const eventUrl = window.location.href.split("?")[0];
  const eventDateParsed = event?.date ? parseISO(event.date) : null;
  const isEventPast = eventDateParsed ? isBefore(eventDateParsed, startOfDay(new Date())) : false;
  const shareMessage = linkedMatchDay
    ? isEventPast
      ? `Look how the last Volleyball Game finished. Super interesting!\n${eventUrl}`
      : `Our Volleyball game is ready! Check the teams, and track points\n${eventUrl}`
    : `Check this Volleyball Event, and let me know if you can make it\n${eventUrl}`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: event?.title ?? "Event", text: shareMessage });
    } else {
      navigator.clipboard.writeText(shareMessage);
      toast.success("Link copied to clipboard");
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
              Your event was created successfully
            </DialogTitle>
            <DialogDescription>
              Modify details, share the event and get moving.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 w-full mt-2">
            <Button
              className="w-full gap-2"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
              Share event
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
              Dismiss
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading event...</p>
        {createdDialog}
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Event not found</p>
        <Button variant="outline" onClick={() => navigate("/events")}>
          Go home
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
  const formattedDate = format(parsedDate, "EEEE, d MMMM yyyy");
  const startTime = event.start_time?.slice(0, 5); // HH:MM
  const endTime = event.end_time?.slice(0, 5);
  const attendingCount = attendingPlayerIds.length;

  const rsvpLabel = currentRsvp
    ? currentRsvp.status === "attending"
      ? "Going"
      : "Not Going"
    : "RSVP";

  const typeConfig = EVENT_TYPE_CONFIG[event.event_type];

  const creatorName = creatorProfile
    ? `${creatorProfile.first_name} ${creatorProfile.last_name}`
    : "Unknown";

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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-full bg-background/60 backdrop-blur-sm hover:bg-background/80">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="gap-2"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" />
                Share event
              </DropdownMenuItem>
              {isCreator && (
                <>
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
                    Edit event
                  </DropdownMenuItem>
                  {event.status !== "cancelled" && (
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
                      Cancel event
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="gap-2 text-destructive focus:text-destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete event
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
                {isToday(parsedDate) ? "Today" : format(parsedDate, "MMM")}
              </span>
            </div>
            <div className="bg-white dark:bg-card text-foreground text-center py-1.5">
              <span className="text-2xl font-bold leading-none block">
                {format(parsedDate, "d")}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(parsedDate, "EEE")}
              </span>
            </div>
          </div>
          {currentRsvp && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground pb-1">
              <User className="h-4 w-4" />
              {currentRsvp.status === "attending"
                ? "You're Going"
                : "Not Going"}
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
            {!event.is_public && (
              <span className="inline-block text-xs font-medium bg-muted px-2 py-0.5 rounded">
                Club Members Only
              </span>
            )}
            {isRecurring && (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                <Repeat className="h-3 w-3" />
                {(event.recurrence_rule ?? "weekly") === "weekly" ? "Weekly" : "Monthly"}
              </span>
            )}
          </div>
        </div>

        {/* Details section */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Details</h2>

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
          <div className="flex items-start gap-3">
            {typeConfig ? (
              <typeConfig.Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
            ) : (
              <Swords className="h-5 w-5 text-muted-foreground mt-0.5" />
            )}
            <p className="text-sm">
              {typeConfig?.label ?? event.event_type}
            </p>
          </div>

        </div>

        {/* Cancellation block OR Description / Notes */}
        {event.status === "cancelled" ? (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 space-y-1">
            <h2 className="text-lg font-bold text-amber-800 dark:text-amber-300">Event Cancelled</h2>
            {event.cancellation_reason && (
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Reason: {event.cancellation_reason}
              </p>
            )}
            {event.cancellation_comment && (
              <p className="text-sm text-amber-600 dark:text-amber-400">{event.cancellation_comment}</p>
            )}
          </div>
        ) : event.notes ? (
          <div className="space-y-2">
            <h2 className="text-lg font-bold">Description / Notes</h2>
            <p className="text-sm">{event.notes}</p>
          </div>
        ) : null}

        {/* Hosted by section */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold">Hosted by</h2>
          <div className="rounded-xl border shadow-sm overflow-hidden">
            {/* Club row */}
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
                      {memberCount} {memberCount === 1 ? "Member" : "Members"}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Separator between club and creator */}
            {event.clubs && <div className="border-t mx-4" />}

            {/* Creator row */}
            <div className="flex items-center gap-3 px-4 py-3">
              {creatorProfile?.image_url ? (
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
              <div>
                <p className="font-semibold">{creatorName}</p>
                <p className="text-sm text-muted-foreground">
                  {isCreator ? "Organizer" : "Organizer"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RSVP section */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold">{attendingCount} Going</h2>
          {attendees.length > 0 ? (
            <div className="space-y-2">
              {attendees.map((a) => (
                <div key={a.player_id} className="flex items-center gap-3">
                  {a.image_url ? (
                    <img
                      src={a.image_url}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "/avatar-placeholder.svg";
                      }}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {a.first_name} {a.last_name?.charAt(0)}.
                    </p>
                    {a.primary_position && (
                      <p className="text-xs text-muted-foreground">
                        {a.primary_position}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No responses yet</p>
          )}
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
                disabled={rsvpMutation.isPending || event.status === "cancelled"}
              >
                {rsvpLabel}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                className="gap-2"
                onClick={() => rsvpMutation.mutate("attending")}
              >
                Going
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2"
                onClick={() => rsvpMutation.mutate("declined")}
              >
                Not Going
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Start Game / View Game — visible to attending players only */}
          {isAttending && linkedMatchDay ? (
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => navigate(`/game/${linkedMatchDay.id}`)}
              disabled={event.status === "cancelled"}
            >
              View Game
            </Button>
          ) : isAttending ? (
            <Button
              className="flex-1"
              onClick={handleStartGame}
              disabled={!isEventToday || isStartingGame || event.status === "cancelled" || attendees.filter((a) => a.status === "attending").length < 4}
            >
              {isStartingGame ? "Starting..." : "Start Game"}
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

      {/* Cancel event dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={(open) => {
        setCancelDialogOpen(open);
        if (!open) { setCancelReason(""); setCancelComment(""); }
      }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Cancel event</DialogTitle>
            <DialogDescription>
              Select a reason for cancelling this event.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Select value={cancelReason} onValueChange={setCancelReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Not enough players">Not enough players</SelectItem>
                <SelectItem value="Bad weather">Bad weather</SelectItem>
                <SelectItem value="Venue unavailable">Venue unavailable</SelectItem>
                <SelectItem value="Scheduling conflict">Scheduling conflict</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder={cancelReason === "Other" ? "Please describe the reason (required)" : "Additional comment (optional)"}
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
                Back
              </Button>
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                disabled={!cancelReason || (cancelReason === "Other" && !cancelComment.trim()) || cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
              >
                {cancelMutation.isPending ? "Cancelling..." : "Cancel Event"}
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
              {recurrenceScopeAction === "cancel" ? "Cancel recurring event" : "Edit recurring event"}
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
              This event only
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
              This and all future events
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{event.title}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventDetail;
