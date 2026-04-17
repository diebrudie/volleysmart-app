import * as React from "react";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Swords,
  Users,
  Dumbbell,
  Trophy,
  Globe,
  Lock,
  CalendarIcon,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  createPlannedEvent,
  type EventType,
  type CreateEventInput,
} from "@/integrations/supabase/plannedEvents";
import { toast } from "sonner";

// ─── Event type definitions ───────────────────────────────────────────────────
const EVENT_TYPES: {
  value: EventType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: "friendly_game",
    label: "Friendly Game",
    description: "Casual match within your club",
    icon: <Swords className="h-6 w-6" />,
    color:
      "border-blue-400 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300",
  },
  {
    value: "social_game",
    label: "Social Game",
    description: "Fun, relaxed — open to all levels",
    icon: <Users className="h-6 w-6" />,
    color:
      "border-green-400 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300",
  },
  {
    value: "training",
    label: "Training",
    description: "Practice and skill development session",
    icon: <Dumbbell className="h-6 w-6" />,
    color:
      "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300",
  },
  {
    value: "tournament",
    label: "Tournament",
    description: "Multi-club competitive event",
    icon: <Trophy className="h-6 w-6" />,
    color:
      "border-purple-400 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300",
  },
];

// ─── RSVP deadline preset options ────────────────────────────────────────────
const RSVP_PRESETS = [
  { label: "Same day", getDays: () => 0 },
  { label: "1 day before", getDays: () => 1 },
  { label: "3 days before", getDays: () => 3 },
  { label: "1 week before", getDays: () => 7 },
  { label: "Custom", getDays: () => null },
] as const;

// ─── Step progress indicator ──────────────────────────────────────────────────
const StepIndicator: React.FC<{ step: number; total: number }> = ({
  step,
  total,
}) => (
  <div className="flex items-center gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className={cn(
          "h-1.5 rounded-full transition-all",
          i < step ? "bg-primary flex-1" : "bg-muted flex-1"
        )}
      />
    ))}
  </div>
);

// ─── Form state ───────────────────────────────────────────────────────────────
interface FormState {
  event_type: EventType | null;
  title: string;
  date: Date | null;
  start_time: string;
  location_name: string;
  rsvp_preset: number | null; // index into RSVP_PRESETS, or null for custom
  rsvp_custom_date: Date | null;
  club_id: string;
  extra_club_ids: string[];
  max_players: string;
  is_public: boolean;
  notes: string;
}

const INITIAL_STATE: FormState = {
  event_type: null,
  title: "",
  date: null,
  start_time: "18:00",
  location_name: "",
  rsvp_preset: 1, // "1 day before" default
  rsvp_custom_date: null,
  club_id: "",
  extra_club_ids: [],
  max_players: "",
  is_public: true,
  notes: "",
};

// ─── Compute RSVP deadline timestamp ─────────────────────────────────────────
function computeRsvpDeadline(form: FormState): string | undefined {
  if (!form.date) return undefined;
  if (form.rsvp_preset === null) {
    // custom
    return form.rsvp_custom_date
      ? form.rsvp_custom_date.toISOString()
      : undefined;
  }
  const daysOffset = RSVP_PRESETS[form.rsvp_preset].getDays();
  if (daysOffset === null) return undefined;
  const deadline = addDays(form.date, -daysOffset);
  deadline.setHours(23, 59, 0, 0);
  return deadline.toISOString();
}

// ─── Main page ────────────────────────────────────────────────────────────────
const CreateEvent: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = React.useState(1);
  const [form, setForm] = React.useState<FormState>(INITIAL_STATE);
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);
  const [rsvpPickerOpen, setRsvpPickerOpen] = React.useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Fetch user's clubs
  const { data: userClubs = [] } = useQuery({
    queryKey: ["user-clubs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("club_members")
        .select("clubs(id, name)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .in("role", ["admin", "editor"]);
      return (data ?? [])
        .map((m) => m.clubs)
        .filter(Boolean) as { id: string; name: string }[];
    },
    enabled: !!user?.id,
  });

  // Pre-select first club
  React.useEffect(() => {
    if (userClubs.length > 0 && !form.club_id) {
      set("club_id", userClubs[0].id);
    }
  }, [userClubs, form.club_id]);

  const createMutation = useMutation({
    mutationFn: (input: CreateEventInput) =>
      createPlannedEvent(user!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
      toast.success("Event created!");
      navigate("/home");
    },
    onError: () => {
      toast.error("Failed to create event. Please try again.");
    },
  });

  const handleSubmit = () => {
    if (!form.event_type || !form.date || !form.club_id || !form.title.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const input: CreateEventInput = {
      title: form.title.trim(),
      event_type: form.event_type,
      date: format(form.date, "yyyy-MM-dd"),
      start_time: form.start_time,
      club_id: form.club_id,
      location_name: form.location_name.trim() || undefined,
      is_public: form.is_public,
      max_players: form.max_players ? parseInt(form.max_players, 10) : undefined,
      notes: form.notes.trim() || undefined,
      rsvp_deadline: computeRsvpDeadline(form),
      extra_club_ids:
        form.event_type === "tournament" ? form.extra_club_ids : undefined,
    };

    createMutation.mutate(input);
  };

  const canGoNext = (): boolean => {
    if (step === 1) return !!form.event_type;
    if (step === 2)
      return !!form.title.trim() && !!form.date && !!form.start_time;
    if (step === 3) return !!form.club_id;
    return false;
  };

  const today = startOfDay(new Date());

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),16px)] pb-4 border-b">
        <button
          type="button"
          onClick={() => (step === 1 ? navigate(-1) : setStep(step - 1))}
          className="p-2 -ml-2 rounded-full hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">
            Step {step} of 3
          </p>
          <h1 className="text-base font-semibold leading-tight">
            {step === 1 && "Choose event type"}
            {step === 2 && "Event details"}
            {step === 3 && "Club & options"}
          </h1>
        </div>
      </header>

      {/* Progress */}
      <div className="px-4 py-3">
        <StepIndicator step={step} total={3} />
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-4 pb-32 max-w-2xl mx-auto w-full">
        {/* ── Step 1: Event type ── */}
        {step === 1 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
            {EVENT_TYPES.map((type) => {
              const selected = form.event_type === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => set("event_type", type.value)}
                  className={cn(
                    "relative flex flex-col gap-2 rounded-2xl border-2 p-5 text-left transition-all",
                    selected
                      ? type.color + " border-current"
                      : "border-border bg-card hover:bg-muted"
                  )}
                >
                  {selected && (
                    <Check className="absolute top-3 right-3 h-4 w-4" />
                  )}
                  {type.icon}
                  <span className="font-semibold">{type.label}</span>
                  <span className="text-sm opacity-70">{type.description}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Step 2: Details ── */}
        {step === 2 && (
          <div className="space-y-5 pt-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title">Event title *</Label>
              <Input
                id="title"
                placeholder="e.g. Saturday Friendly"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "w-full flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-left",
                      !form.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4 shrink-0" />
                    {form.date ? format(form.date, "PPP") : "Pick a date"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.date ?? undefined}
                    onSelect={(d) => {
                      set("date", d ?? null);
                      setDatePickerOpen(false);
                    }}
                    disabled={(d) => isBefore(d, today)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Start time */}
            <div className="space-y-1.5">
              <Label htmlFor="start_time">Start time *</Label>
              <Input
                id="start_time"
                type="time"
                value={form.start_time}
                onChange={(e) => set("start_time", e.target.value)}
                className="w-full"
              />
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g. Sports Hall, Court 3"
                value={form.location_name}
                onChange={(e) => set("location_name", e.target.value)}
              />
            </div>

            {/* RSVP deadline */}
            <div className="space-y-2">
              <Label>RSVP deadline</Label>
              <div className="flex flex-wrap gap-2">
                {RSVP_PRESETS.map((preset, i) => {
                  const isCustom = preset.label === "Custom";
                  const selected = isCustom
                    ? form.rsvp_preset === null
                    : form.rsvp_preset === i;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        if (isCustom) {
                          set("rsvp_preset", null);
                          setRsvpPickerOpen(true);
                        } else {
                          set("rsvp_preset", i);
                        }
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-full border text-sm font-medium transition-colors",
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-muted"
                      )}
                    >
                      {isCustom && form.rsvp_custom_date
                        ? format(form.rsvp_custom_date, "MMM d")
                        : preset.label}
                    </button>
                  );
                })}
              </div>
              {/* Custom date picker */}
              {form.rsvp_preset === null && (
                <Popover open={rsvpPickerOpen} onOpenChange={setRsvpPickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                        !form.rsvp_custom_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="h-4 w-4" />
                      {form.rsvp_custom_date
                        ? format(form.rsvp_custom_date, "PPP")
                        : "Pick deadline date"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.rsvp_custom_date ?? undefined}
                      onSelect={(d) => {
                        set("rsvp_custom_date", d ?? null);
                        setRsvpPickerOpen(false);
                      }}
                      disabled={(d) => isBefore(d, today)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        )}

        {/* ── Step 3: Club & options ── */}
        {step === 3 && (
          <div className="space-y-5 pt-2">
            {/* Club */}
            <div className="space-y-1.5">
              <Label>Club *</Label>
              {userClubs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You need to be an admin or editor of a club to create events.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {userClubs.map((club) => {
                    const selected = form.club_id === club.id;
                    return (
                      <button
                        key={club.id}
                        type="button"
                        onClick={() => set("club_id", club.id)}
                        className={cn(
                          "flex items-center justify-between rounded-xl border px-4 py-3 text-sm text-left transition-colors",
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted"
                        )}
                      >
                        <span className="font-medium">{club.name}</span>
                        {selected && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* For tournaments: additional clubs */}
            {form.event_type === "tournament" && userClubs.length > 1 && (
              <div className="space-y-1.5">
                <Label>Additional clubs (tournament)</Label>
                <div className="flex flex-col gap-2">
                  {userClubs
                    .filter((c) => c.id !== form.club_id)
                    .map((club) => {
                      const included = form.extra_club_ids.includes(club.id);
                      return (
                        <button
                          key={club.id}
                          type="button"
                          onClick={() =>
                            set(
                              "extra_club_ids",
                              included
                                ? form.extra_club_ids.filter(
                                    (id) => id !== club.id
                                  )
                                : [...form.extra_club_ids, club.id]
                            )
                          }
                          className={cn(
                            "flex items-center justify-between rounded-xl border px-4 py-3 text-sm text-left transition-colors",
                            included
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted"
                          )}
                        >
                          <span>{club.name}</span>
                          {included && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Max players */}
            <div className="space-y-1.5">
              <Label htmlFor="max_players">Max players (optional)</Label>
              <Input
                id="max_players"
                type="number"
                min={4}
                max={100}
                placeholder="e.g. 12"
                value={form.max_players}
                onChange={(e) => set("max_players", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Minimum is 4</p>
            </div>

            {/* Visibility */}
            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => set("is_public", true)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
                    form.is_public
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-muted"
                  )}
                >
                  <Globe className="h-4 w-4" />
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => set("is_public", false)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
                    !form.is_public
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-muted"
                  )}
                >
                  <Lock className="h-4 w-4" />
                  Private
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any extra info for participants…"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom action bar */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-3 bg-background border-t
                   pb-[max(env(safe-area-inset-bottom),12px)]"
      >
        <div className="max-w-2xl mx-auto">
          {step < 3 ? (
            <Button
              className="w-full"
              disabled={!canGoNext()}
              onClick={() => setStep(step + 1)}
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          ) : (
            <Button
              className="w-full"
              disabled={!canGoNext() || createMutation.isPending}
              onClick={handleSubmit}
            >
              {createMutation.isPending ? "Creating…" : "Create Event"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateEvent;
