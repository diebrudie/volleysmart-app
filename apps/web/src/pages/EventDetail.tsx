import * as React from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchSingleEvent,
  deletePlannedEvent,
  upsertRsvp,
  type PlannedEvent,
  type RsvpStatus,
} from "@/integrations/supabase/plannedEvents";
import { toast } from "sonner";

// ─── Event type display config ──────────────────────────────────────────────
const EVENT_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode }
> = {
  friendly_game: { label: "Friendly Game", icon: <Swords className="h-5 w-5" /> },
  social_game: { label: "Social Game", icon: <Users className="h-5 w-5" /> },
  training: { label: "Training", icon: <Dumbbell className="h-5 w-5" /> },
  tournament: { label: "Tournament", icon: <Trophy className="h-5 w-5" /> },
};

// ─── RSVP attendee with profile info ─────────────────────────────────────────
interface Attendee {
  player_id: string;
  status: RsvpStatus;
  first_name: string;
  last_name: string;
  image_url: string | null;
  primary_position: string | null;
}

// ─── Main page ───────────────────────────────────────────────────────────────
const EventDetail: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
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

  // Fetch attendee profiles (players who RSVPed)
  const attendingPlayerIds =
    event?.event_rsvp
      ?.filter((r) => r.status === "attending")
      .map((r) => r.player_id) ?? [];

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

      return (players ?? []).map((p: any) => {
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

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => deletePlannedEvent(eventId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
      toast.success("Event deleted");
      navigate("/home");
    },
    onError: () => toast.error("Failed to delete event"),
  });

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
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: event?.title ?? "Event",
                    url: window.location.href.split("?")[0],
                  });
                } else {
                  navigator.clipboard.writeText(
                    window.location.href.split("?")[0]
                  );
                  toast.success("Link copied to clipboard");
                }
              }}
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
        <Button variant="outline" onClick={() => navigate("/home")}>
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
  const parsedDate = parseISO(event.date);
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

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24">
      {/* Gradient hero */}
      <div className="relative h-48 bg-gradient-to-br from-primary/30 via-primary/10 to-background">
        {/* Top bar overlay */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),16px)]">
          <button
            onClick={() => navigate("/home")}
            className="p-2 rounded-full bg-background/60 backdrop-blur-sm hover:bg-background/80"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {isCreator && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-full bg-background/60 backdrop-blur-sm hover:bg-background/80">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled className="gap-2">
                  <Pencil className="h-4 w-4" />
                  Edit event
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 text-destructive focus:text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete event
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-12 max-w-2xl mx-auto w-full space-y-8">
        {/* Date badge + RSVP status */}
        <div className="flex items-center justify-between">
          {/* Calendar badge — square 1:1 */}
          <div className="w-16 rounded-lg overflow-hidden shadow-md">
            <div className="bg-primary text-primary-foreground text-center py-1">
              <span className="text-xs font-semibold uppercase">
                {format(parsedDate, "MMM")}
              </span>
            </div>
            <div className="bg-card text-card-foreground text-center py-1.5">
              <span className="text-2xl font-bold leading-none block">
                {format(parsedDate, "d")}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(parsedDate, "EEE")}
              </span>
            </div>
          </div>
          {currentRsvp && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
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
          {!event.is_public && (
            <span className="inline-block mt-1.5 text-xs font-medium bg-muted px-2 py-0.5 rounded">
              Club Members Only
            </span>
          )}
        </div>

        {/* Event type + Club row */}
        <div className="flex items-center gap-10">
          <div>
            <p className="text-xs text-muted-foreground">Event Type</p>
            <div className="flex items-center gap-1.5 font-semibold">
              {typeConfig?.icon}
              {typeConfig?.label ?? event.event_type}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Club</p>
            <p className="font-semibold">
              {event.clubs?.name ?? (
                <span className="text-muted-foreground">Personal</span>
              )}
            </p>
          </div>
        </div>

        {/* Details section */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Details</h2>

          {/* Date + time */}
          <div className="flex items-start gap-3">
            <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
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

          {/* Notes */}
          {event.notes && (
            <div className="rounded-lg border p-3">
              <p className="text-sm">{event.notes}</p>
            </div>
          )}
        </div>

        {/* RSVP section */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold">
            {attendingCount} Going
          </h2>
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
      <div className="fixed bottom-0 left-0 right-0 px-4 py-3 bg-background border-t pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={
                  currentRsvp?.status === "attending"
                    ? "default"
                    : currentRsvp?.status === "declined"
                      ? "destructive"
                      : "outline"
                }
                className="gap-1.5"
                disabled={rsvpMutation.isPending}
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

          {/* Start Game (creator only, future feature) */}
          {isCreator && (
            <Button className="flex-1" disabled>
              Start Game
            </Button>
          )}
        </div>
      </div>

      {createdDialog}

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
