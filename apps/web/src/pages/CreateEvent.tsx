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
  UserCircle,
  Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
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
import {
  fetchEventTemplates,
  createEventTemplate,
  type EventTemplate,
  type TemplateConfig,
} from "@/integrations/supabase/eventTemplates";
import { EventLocationSelector } from "@/components/forms/EventLocationSelector";
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
// club_id: string = a club UUID, "__none__" = explicitly no club, "" = not yet chosen
interface FormState {
  event_type: EventType | null;
  title: string;
  date: Date | null;
  start_time: string;
  location_id: string | null;
  rsvp_preset: number | null; // index into RSVP_PRESETS, or null for custom
  rsvp_custom_date: Date | null;
  club_id: string; // UUID | "__none__" | ""
  extra_club_ids: string[];
  max_players: string;
  is_public: boolean;
  notes: string;
  save_template: boolean;
  template_name: string;
}

const NO_CLUB = "__none__";

const INITIAL_STATE: FormState = {
  event_type: null,
  title: "",
  date: null,
  start_time: "18:00",
  location_id: null,
  rsvp_preset: 1, // "1 day before" default
  rsvp_custom_date: null,
  club_id: "",
  extra_club_ids: [],
  max_players: "",
  is_public: true,
  notes: "",
  save_template: false,
  template_name: "",
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

  // Fetch user's clubs (admin/editor)
  const { data: userClubs = [] } = useQuery({
    queryKey: ["user-clubs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("club_members")
        .select("clubs(id, name)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .in("role", ["admin", "editor"]);
      return (data ?? [])
        .map((m) => m.clubs)
        .filter(Boolean) as { id: string; name: string }[];
    },
    enabled: !!user?.id,
  });

  // Fetch templates (non-critical — don't retry on failure)
  const { data: templates = [] } = useQuery({
    queryKey: ["event-templates", user?.id],
    queryFn: () => fetchEventTemplates(user!.id),
    enabled: !!user?.id,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Pre-select first club if user has clubs and hasn't chosen yet
  React.useEffect(() => {
    if (userClubs.length > 0 && !form.club_id) {
      set("club_id", userClubs[0].id);
    }
  }, [userClubs, form.club_id]);

  const createMutation = useMutation({
    mutationFn: async (input: CreateEventInput) => {
      const result = await createPlannedEvent(user!.id, input);

      // Save template if requested (non-blocking — don't fail event creation)
      if (form.save_template && form.template_name.trim()) {
        try {
          const config: TemplateConfig = {
            event_type: input.event_type,
            title: input.title,
            start_time: input.start_time,
            location_id: input.location_id ?? undefined,
            max_players: input.max_players,
            is_public: input.is_public,
            notes: input.notes,
            rsvp_preset: form.rsvp_preset ?? undefined,
          };
          await createEventTemplate(user!.id, {
            name: form.template_name.trim(),
            club_id: input.club_id,
            config,
          });
        } catch {
          console.warn("Failed to save template, event was still created.");
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
      queryClient.invalidateQueries({ queryKey: ["event-templates"] });
      toast.success("Event created!");
      navigate("/home");
    },
    onError: () => {
      toast.error("Failed to create event. Please try again.");
    },
  });

  const handleSubmit = () => {
    if (!form.event_type || !form.date || !form.title.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    // Club must be chosen (either a real club or explicitly "no club")
    if (!form.club_id) {
      toast.error("Please select a club or choose 'No club'.");
      return;
    }

    const clubId = form.club_id === NO_CLUB ? null : form.club_id;

    const input: CreateEventInput = {
      title: form.title.trim(),
      event_type: form.event_type,
      date: format(form.date, "yyyy-MM-dd"),
      start_time: form.start_time,
      club_id: clubId,
      location_id: form.location_id,
      is_public: form.is_public,
      max_players: form.max_players ? parseInt(form.max_players, 10) : undefined,
      notes: form.notes.trim() || undefined,
      rsvp_deadline: computeRsvpDeadline(form),
      extra_club_ids:
        form.event_type === "tournament" && clubId
          ? form.extra_club_ids
          : undefined,
    };

    createMutation.mutate(input);
  };

  // Apply a template to the form
  const applyTemplate = (template: EventTemplate) => {
    const c = template.config;
    setForm((prev) => ({
      ...prev,
      event_type: c.event_type ?? prev.event_type,
      title: c.title ?? prev.title,
      start_time: c.start_time ?? prev.start_time,
      location_id: c.location_id ?? prev.location_id,
      max_players: c.max_players != null ? String(c.max_players) : prev.max_players,
      is_public: c.is_public ?? prev.is_public,
      notes: c.notes ?? prev.notes,
      rsvp_preset: c.rsvp_preset ?? prev.rsvp_preset,
      club_id: template.club_id ?? prev.club_id,
    }));
    // If event type is set, advance to step 2
    if (c.event_type) {
      setStep(2);
    }
    toast.success(`Template "${template.name}" applied`);
  };

  const canGoNext = (): boolean => {
    if (step === 1) return !!form.event_type;
    if (step === 2)
      return (
        !!form.club_id &&
        !!form.title.trim() &&
        !!form.date &&
        !!form.start_time
      );
    if (step === 3) return true; // all step 3 fields are optional
    return false;
  };

  const today = startOfDay(new Date());
  const resolvedClubId =
    form.club_id === NO_CLUB ? null : form.club_id || null;

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
            {step === 2 && "Club & details"}
            {step === 3 && "Options"}
          </h1>
        </div>
      </header>

      {/* Progress */}
      <div className="px-4 py-3">
        <StepIndicator step={step} total={3} />
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-4 pb-32 max-w-2xl mx-auto w-full">
        {/* ── Step 1: Event type + templates ── */}
        {step === 1 && (
          <div className="space-y-5 pt-2">
            {/* Templates */}
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Quick start from template
                </Label>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full border border-border bg-card text-sm font-medium hover:bg-muted transition-colors"
                    >
                      <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Event type cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          </div>
        )}

        {/* ── Step 2: Club + Details ── */}
        {step === 2 && (
          <div className="space-y-5 pt-2">
            {/* Club / No-club selection */}
            <div className="space-y-1.5">
              <Label>Club</Label>
              <div className="flex flex-col gap-2">
                {/* No-club option */}
                <button
                  type="button"
                  onClick={() => {
                    set("club_id", NO_CLUB);
                    set("location_id", null);
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-4 py-3 text-sm text-left transition-colors",
                    form.club_id === NO_CLUB
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">No club — personal event</span>
                  </div>
                  {form.club_id === NO_CLUB && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>

                {/* Club options */}
                {userClubs.map((club) => {
                  const selected = form.club_id === club.id;
                  return (
                    <button
                      key={club.id}
                      type="button"
                      onClick={() => {
                        set("club_id", club.id);
                        set("location_id", null);
                      }}
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
            </div>

            {/* For tournaments: additional clubs */}
            {form.event_type === "tournament" &&
              form.club_id !== NO_CLUB &&
              form.club_id &&
              userClubs.length > 1 && (
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
              <Label>Location</Label>
              <EventLocationSelector
                clubId={resolvedClubId}
                value={form.location_id}
                onValueChange={(id) => set("location_id", id)}
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

        {/* ── Step 3: Options ── */}
        {step === 3 && (
          <div className="space-y-5 pt-2">
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

            {/* Save as template */}
            <div className="space-y-2 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="save-template" className="flex items-center gap-2 cursor-pointer">
                  <Bookmark className="h-4 w-4 text-muted-foreground" />
                  Save as template
                </Label>
                <Switch
                  id="save-template"
                  checked={form.save_template}
                  onCheckedChange={(v) => set("save_template", v)}
                />
              </div>
              {form.save_template && (
                <Input
                  placeholder="Template name, e.g. Thursday Training"
                  value={form.template_name}
                  onChange={(e) => set("template_name", e.target.value)}
                  className="mt-2"
                />
              )}
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
              disabled={createMutation.isPending}
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
