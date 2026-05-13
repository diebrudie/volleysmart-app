import * as React from "react";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { getDateLocale } from "@/lib/dateLocale";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Swords,
  Users,
  Dumbbell,
  Globe,
  Lock,
  Building,
  Palmtree,
  Shield,
  CalendarIcon,
  Check,
  Bookmark,
  LayoutGrid,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  createPlannedEvent,
  type EventType,
  type CreateEventInput,
} from "@/integrations/supabase/plannedEvents";
import {
  fetchEventTemplates,
  createEventTemplate,
  deleteEventTemplate,
  type EventTemplate,
  type TemplateConfig,
} from "@/integrations/supabase/eventTemplates";
import { EventLocationSelector } from "@/components/forms/EventLocationSelector";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

// ─── Event type definitions ───────────────────────────────────────────────────
const EVENT_TYPES: {
  value: EventType;
  labelKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: "friendly_game",
    labelKey: "create.typeFriendlyGame",
    descriptionKey: "create.typeFriendlyGameDesc",
    icon: <Swords className="h-6 w-6" />,
    color:
      "border-blue-400 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300",
  },
  {
    value: "social_game",
    labelKey: "create.typeSocialGame",
    descriptionKey: "create.typeSocialGameDesc",
    icon: <Users className="h-6 w-6" />,
    color:
      "border-green-400 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300",
  },
  {
    value: "training",
    labelKey: "create.typeTraining",
    descriptionKey: "create.typeTrainingDesc",
    icon: <Dumbbell className="h-6 w-6" />,
    color:
      "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300",
  },
];

// ─── RSVP deadline preset options ────────────────────────────────────────────
const RSVP_PRESETS = [
  { labelKey: "create.rsvpSameDay", getDays: () => 0 },
  { labelKey: "create.rsvp1DayBefore", getDays: () => 1 },
  { labelKey: "create.rsvp3DaysBefore", getDays: () => 3 },
  { labelKey: "create.rsvp1WeekBefore", getDays: () => 7 },
  { labelKey: "create.rsvpCustom", getDays: () => null },
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
  end_time: string;
  location_id: string | null;
  rsvp_preset: number | null; // index into RSVP_PRESETS, or null for custom
  rsvp_custom_date: Date | null;
  club_id: string; // UUID | "__none__" | ""
  extra_club_ids: string[];
  max_players: string;
  is_public: boolean;
  event_gender: "mixed" | "women_only" | "men_only";
  activity_type: "indoor" | "beach";
  notes: string;
  save_template: boolean;
  template_name: string;
  recurrence_rule: "weekly" | "monthly" | null;
  is_opponent_mode: boolean;
  opponent_team_name: string;
}

const NO_CLUB = "__none__";

const INITIAL_STATE: FormState = {
  event_type: null,
  title: "",
  date: null,
  start_time: "18:00",
  end_time: "20:00",
  location_id: null,
  rsvp_preset: 1, // "1 day before" default
  rsvp_custom_date: null,
  club_id: "",
  extra_club_ids: [],
  max_players: "",
  is_public: true,
  event_gender: "mixed",
  activity_type: "indoor",
  notes: "",
  save_template: false,
  template_name: "",
  recurrence_rule: null,
  is_opponent_mode: false,
  opponent_team_name: "",
};

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKLY_EVERY = ["1 week", "2 weeks", "3 weeks", "4 weeks"];
const MONTHLY_EVERY = ["1st", "2nd", "3rd", "4th", "Last"];

/** Convert JS getDay() (0=Sun) to our index (0=Mon). */
function jsDayToIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

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
  const { t } = useTranslation("events");
  const isCompact = useIsCompact();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedClubId = searchParams.get("clubId");
  const queryClient = useQueryClient();

  const [step, setStep] = React.useState(1);
  const [form, setForm] = React.useState<FormState>(INITIAL_STATE);
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);
  const [templateSheetOpen, setTemplateSheetOpen] = React.useState(false);
  const [rsvpCalendarOpen, setRsvpCalendarOpen] = React.useState(false);

  // Recurrence config state
  const [repeatsOnDays, setRepeatsOnDays] = React.useState<number[]>([]); // weekly: multiple days
  const [repeatsOnDay, setRepeatsOnDay] = React.useState<number>(0); // monthly: single day
  const [everyWeek, setEveryWeek] = React.useState("1 week");
  const [everyMonth, setEveryMonth] = React.useState("1st");
  const [repeatsOnOpen, setRepeatsOnOpen] = React.useState(false);
  const [everyOpen, setEveryOpen] = React.useState(false);

  // Sync recurrence defaults when date changes or recurrence turns on
  React.useEffect(() => {
    if (form.date && form.recurrence_rule) {
      const dayIdx = jsDayToIndex(form.date.getDay());
      if (repeatsOnDays.length === 0) setRepeatsOnDays([dayIdx]);
      setRepeatsOnDay(dayIdx);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.date, form.recurrence_rule]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Fetch user's clubs (all active memberships)
  const { data: userClubs = [] } = useQuery({
    queryKey: ["user-clubs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("club_members")
        .select("clubs!inner(id, name, status)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .eq("status", "active")
        .eq("clubs.status", "active");
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

  // Fetch player's city for location proximity bias
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  const { data: playerCity } = useQuery({
    queryKey: ["player-city", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("players")
        .select("city")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data?.city ?? null;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  });

  // Geocode player's city once → [lng, lat] for Mapbox proximity
  const { data: cityProximity = null } = useQuery({
    queryKey: ["geocode-city", playerCity],
    queryFn: async (): Promise<[number, number] | null> => {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        playerCity!
      )}.json?types=place&limit=1&access_token=${mapboxToken}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const json = await res.json();
      const center = json.features?.[0]?.center;
      return center ? [center[0], center[1]] : null;
    },
    enabled: !!playerCity && !!mapboxToken,
    staleTime: 30 * 60 * 1000,
  });

  // Pre-select club: prefer ?clubId param, then first club, then NO_CLUB
  React.useEffect(() => {
    if (form.club_id) return; // already chosen
    if (preselectedClubId && userClubs.some((c) => c.id === preselectedClubId)) {
      set("club_id", preselectedClubId);
    } else if (userClubs.length > 0) {
      set("club_id", userClubs[0].id);
    } else if (userClubs.length === 0) {
      set("club_id", NO_CLUB);
    }
  }, [userClubs, form.club_id, preselectedClubId]);

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
            end_time: input.end_time,
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
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
      queryClient.invalidateQueries({ queryKey: ["event-templates"] });
      navigate(`/events/${result.id}?created=true`);
    },
    onError: () => {
      toast.error(t("create.errorCreateFailed"));
    },
  });

  const handleSubmit = () => {
    if (!form.event_type || !form.date || !form.title.trim()) {
      toast.error(t("create.errorRequired"));
      return;
    }
    // Club must be chosen (either a real club or explicitly "no club")
    if (!form.club_id) {
      toast.error(t("create.errorSelectClub"));
      return;
    }

    const clubId = form.club_id === NO_CLUB ? null : form.club_id;

    const input: CreateEventInput = {
      title: form.title.trim(),
      event_type: form.event_type,
      date: format(form.date, "yyyy-MM-dd"),
      start_time: form.start_time,
      end_time: form.end_time,
      club_id: clubId,
      location_id: form.location_id,
      is_public: form.is_public,
      event_gender: form.event_gender,
      activity_type: form.activity_type,
      max_players: form.max_players ? parseInt(form.max_players, 10) : undefined,
      notes: form.notes.trim() || undefined,
      rsvp_deadline: computeRsvpDeadline(form),
      extra_club_ids:
        form.event_type === "tournament" && clubId
          ? form.extra_club_ids
          : undefined,
      recurrence_rule: form.recurrence_rule ?? undefined,
      is_opponent_mode: form.is_opponent_mode,
      opponent_team_name: form.opponent_team_name.trim() || undefined,
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
      end_time: c.end_time ?? prev.end_time,
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
    toast.success(t("create.templateApplied", { name: template.name }));
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await deleteEventTemplate(templateId);
      queryClient.invalidateQueries({ queryKey: ["event-templates"] });
      toast.success(t("create.templateDeleted"));
    } catch {
      toast.error(t("create.templateDeleteFailed"));
    }
  };

  const canGoNext = (): boolean => {
    if (step === 1) return !!form.event_type;
    if (step === 2)
      return (
        !!form.club_id &&
        !!form.title.trim() &&
        !!form.date &&
        !!form.start_time &&
        !!form.end_time &&
        !!form.location_id
      );
    if (step === 3) return true; // all step 3 fields are optional
    return false;
  };

  const today = startOfDay(new Date());
  const resolvedClubId =
    form.club_id === NO_CLUB ? null : form.club_id || null;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar — fixed */}
      <header className="fixed top-0 left-0 right-0 flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),16px)] pb-4 border-b bg-background z-40">
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
            {t("create.stepOf", { step, total: 3 })}
          </p>
          <h1 className="text-base font-semibold leading-tight">
            {step === 1 && t("create.stepChooseType")}
            {step === 2 && t("create.stepClubDetails")}
            {step === 3 && t("create.stepOptions")}
          </h1>
        </div>
      </header>

      {/* Scrollable content — padded for fixed header + bottom bar */}
      <div className="px-4 pt-[calc(max(env(safe-area-inset-top),16px)+72px)] pb-[calc(max(env(safe-area-inset-bottom),12px)+72px)] max-w-2xl mx-auto w-full" style={{ scrollbarWidth: "none" }}>
        {/* Progress */}
        <div className="py-3">
          <StepIndicator step={step} total={3} />
        </div>
        {/* ── Step 1: Event type + templates ── */}
        {step === 1 && (
          <div className="space-y-3 pt-2">
            {/* Event type cards */}
            <div className="flex flex-col gap-3">
              {EVENT_TYPES.map((type) => {
                const selected = form.event_type === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => set("event_type", type.value)}
                    className={cn(
                      "relative flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all",
                      selected
                        ? type.color + " border-current"
                        : "border-border bg-card hover:bg-muted"
                    )}
                  >
                    {selected && (
                      <Check className="absolute top-3 right-3 h-4 w-4" />
                    )}
                    <span className="shrink-0">{type.icon}</span>
                    <div className="flex flex-col">
                      <span className="font-semibold">{t(type.labelKey)}</span>
                      <span className="text-xs opacity-70">{t(type.descriptionKey)}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Templates button */}
            <button
              type="button"
              onClick={() => setTemplateSheetOpen(true)}
              className="w-full flex items-center gap-3 rounded-2xl border-2 border-border bg-muted/50 px-4 py-3 text-left hover:bg-muted transition-colors"
            >
              <span className="shrink-0">
                <LayoutGrid className="h-6 w-6 text-muted-foreground" />
              </span>
              <div className="flex flex-col">
                <span className="font-semibold">{t("create.templates")}</span>
                <span className="text-xs opacity-70">{t("create.templatesDesc")}</span>
              </div>
            </button>

            {/* Templates bottom drawer */}
            <Sheet open={templateSheetOpen} onOpenChange={setTemplateSheetOpen}>
              <SheetContent side={isCompact ? "bottom" : "right"} className={isCompact ? "rounded-t-2xl" : ""}>
                <SheetHeader>
                  <SheetTitle>{t("create.templates")}</SheetTitle>
                </SheetHeader>
                <div className="overflow-y-auto mt-4 max-h-[50vh]">
                  {templates.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      {t("create.noTemplates")}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {templates.map((tpl) => (
                        <div
                          key={tpl.id}
                          className="flex items-center justify-between px-2 py-3 rounded-lg hover:bg-muted"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              applyTemplate(tpl);
                              setTemplateSheetOpen(false);
                            }}
                            className="flex-1 text-left text-sm font-medium"
                          >
                            {tpl.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(tpl.id)}
                            className="p-1.5 rounded-md hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}

        {/* ── Step 2: Club + Details ── */}
        {step === 2 && (
          <div className="space-y-5 pt-2">
            {/* Club dropdown */}
            <div className="space-y-1.5">
              <Label>{t("create.clubLabel")}</Label>
              <Select
                value={form.club_id || NO_CLUB}
                onValueChange={(val) => {
                  set("club_id", val);
                  set("location_id", null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CLUB}>{t("create.noClubPersonal")}</SelectItem>
                  {userClubs.map((club) => (
                    <SelectItem key={club.id} value={club.id}>
                      {club.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title">{t("create.eventName")}</Label>
              <Input
                id="title"
                placeholder={t("create.eventNamePlaceholder")}
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label>{t("create.dateLabel")}</Label>
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
                    {form.date ? format(form.date, "PPP", { locale: getDateLocale() }) : t("create.pickDate")}
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

            {/* Start time + End time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start_time">{t("create.startTime")}</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={form.start_time}
                  onChange={(e) => set("start_time", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end_time">{t("create.endTime")}</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={form.end_time}
                  onChange={(e) => set("end_time", e.target.value)}
                />
              </div>
            </div>

            {/* Recurring toggle */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t("create.recurring")}</p>
                  <p className="text-xs text-muted-foreground">
                    {form.recurrence_rule
                      ? form.recurrence_rule === "weekly"
                        ? t("create.everyWeekday", { days: repeatsOnDays.length > 0 ? repeatsOnDays.map((d) => WEEKDAYS[d]).join(", ") : form.date ? format(form.date, "EEEE", { locale: getDateLocale() }) : "week" })
                        : t("create.monthlyPattern", { ordinal: MONTHLY_EVERY[MONTHLY_EVERY.indexOf(everyMonth)] || "1st", day: WEEKDAYS[repeatsOnDay] })
                      : t("create.doesNotRepeat")}
                  </p>
                </div>
                <Switch
                  checked={!!form.recurrence_rule}
                  onCheckedChange={(on) => {
                    if (on && form.date) {
                      const dayIdx = jsDayToIndex(form.date.getDay());
                      setRepeatsOnDays([dayIdx]);
                      setRepeatsOnDay(dayIdx);
                    }
                    set("recurrence_rule", on ? "weekly" : null);
                  }}
                />
              </div>

              {form.recurrence_rule && (
                <>
                  <Tabs value={form.recurrence_rule} onValueChange={(v) => set("recurrence_rule", v as "weekly" | "monthly")}>
                    <TabsList className="w-full">
                      <TabsTrigger value="weekly" className="flex-1">{t("create.weekly")}</TabsTrigger>
                      <TabsTrigger value="monthly" className="flex-1">{t("create.monthly")}</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Repeats on + Every — side by side dropdown buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">{t("create.repeatsOn")}</Label>
                      <button
                        type="button"
                        onClick={() => setRepeatsOnOpen(true)}
                        className="flex items-center justify-between w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm"
                      >
                        <span>
                          {form.recurrence_rule === "weekly"
                            ? repeatsOnDays.length > 0
                              ? repeatsOnDays.map((d) => WEEKDAYS_SHORT[d]).join(", ")
                              : t("create.select")
                            : WEEKDAYS_SHORT[repeatsOnDay]}
                        </span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">{t("create.every")}</Label>
                      <button
                        type="button"
                        onClick={() => setEveryOpen(true)}
                        className="flex items-center justify-between w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm"
                      >
                        <span>{form.recurrence_rule === "weekly" ? everyWeek : everyMonth}</span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>

                  {/* Repeats on — bottom sheet */}
                  <Sheet open={repeatsOnOpen} onOpenChange={setRepeatsOnOpen}>
                    <SheetContent side="bottom" className="rounded-t-2xl">
                      <SheetHeader>
                        <SheetTitle className="text-xl font-bold text-left">{t("create.repeatsOn")}</SheetTitle>
                      </SheetHeader>
                      <div className="py-2">
                        {form.recurrence_rule === "weekly" ? (
                          /* Weekly: checkboxes for multiple days */
                          <div className="space-y-0">
                            {WEEKDAYS.map((day, i) => (
                              <button
                                key={day}
                                type="button"
                                onClick={() => {
                                  setRepeatsOnDays((prev) =>
                                    prev.includes(i)
                                      ? prev.filter((d) => d !== i)
                                      : [...prev, i].sort()
                                  );
                                }}
                                className="flex items-center justify-between w-full py-3.5 border-b border-border last:border-0"
                              >
                                <span className="text-sm">{day}</span>
                                <Checkbox
                                  checked={repeatsOnDays.includes(i)}
                                  className="h-5 w-5 rounded"
                                />
                              </button>
                            ))}
                          </div>
                        ) : (
                          /* Monthly: radio buttons for single day */
                          <RadioGroup
                            value={String(repeatsOnDay)}
                            onValueChange={(v) => {
                              setRepeatsOnDay(Number(v));
                              setRepeatsOnOpen(false);
                            }}
                          >
                            {WEEKDAYS.map((day, i) => (
                              <label
                                key={day}
                                className="flex items-center justify-between w-full py-3.5 border-b border-border last:border-0 cursor-pointer"
                              >
                                <span className="text-sm">{day}</span>
                                <RadioGroupItem value={String(i)} className="h-5 w-5" />
                              </label>
                            ))}
                          </RadioGroup>
                        )}
                      </div>
                    </SheetContent>
                  </Sheet>

                  {/* Every — bottom sheet */}
                  <Sheet open={everyOpen} onOpenChange={setEveryOpen}>
                    <SheetContent side="bottom" className="rounded-t-2xl">
                      <SheetHeader>
                        <SheetTitle className="text-xl font-bold text-left">{t("create.repeatsEvery")}</SheetTitle>
                      </SheetHeader>
                      <div className="py-2">
                        {form.recurrence_rule === "weekly" ? (
                          <RadioGroup
                            value={everyWeek}
                            onValueChange={(v) => {
                              setEveryWeek(v);
                              setEveryOpen(false);
                            }}
                          >
                            {WEEKLY_EVERY.map((opt) => (
                              <label
                                key={opt}
                                className="flex items-center justify-between w-full py-3.5 border-b border-border last:border-0 cursor-pointer"
                              >
                                <span className="text-sm">{opt}</span>
                                <RadioGroupItem value={opt} className="h-5 w-5" />
                              </label>
                            ))}
                          </RadioGroup>
                        ) : (
                          <RadioGroup
                            value={everyMonth}
                            onValueChange={(v) => {
                              setEveryMonth(v);
                              setEveryOpen(false);
                            }}
                          >
                            {MONTHLY_EVERY.map((opt) => (
                              <label
                                key={opt}
                                className="flex items-center justify-between w-full py-3.5 border-b border-border last:border-0 cursor-pointer"
                              >
                                <span className="text-sm">{opt}</span>
                                <RadioGroupItem value={opt} className="h-5 w-5" />
                              </label>
                            ))}
                          </RadioGroup>
                        )}
                      </div>
                    </SheetContent>
                  </Sheet>
                </>
              )}
            </div>

            {/* Location */}
            <EventLocationSelector
              clubId={resolvedClubId}
              value={form.location_id}
              onValueChange={(id) => set("location_id", id)}
              proximity={cityProximity}
            />

            {/* RSVP deadline */}
            <div className="space-y-2">
              <Label>{t("create.rsvpDeadline")}</Label>
              <Select
                value={form.rsvp_preset === null ? "custom" : String(form.rsvp_preset)}
                onValueChange={(val) => {
                  if (val === "custom") {
                    set("rsvp_preset", null);
                  } else {
                    set("rsvp_preset", parseInt(val, 10));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RSVP_PRESETS.map((preset, i) => (
                    <SelectItem
                      key={preset.labelKey}
                      value={preset.labelKey === "create.rsvpCustom" ? "custom" : String(i)}
                    >
                      {t(preset.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Custom date: toggle button + calendar */}
              {form.rsvp_preset === null && (
                <>
                  <button
                    type="button"
                    onClick={() => setRsvpCalendarOpen((o) => !o)}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-sm w-full",
                      form.rsvp_custom_date
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {form.rsvp_custom_date
                      ? format(form.rsvp_custom_date, "PPP", { locale: getDateLocale() })
                      : t("create.pickDeadlineDate")}
                  </button>
                  {rsvpCalendarOpen && (
                    <div className="rounded-md border p-2">
                      <Calendar
                        mode="single"
                        selected={form.rsvp_custom_date ?? undefined}
                        onSelect={(d) => {
                          set("rsvp_custom_date", d ?? null);
                          setRsvpCalendarOpen(false);
                        }}
                        disabled={(d) => isBefore(d, today)}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Step 3: Options ── */}
        {step === 3 && (
          <div className="space-y-5 pt-2">
            {/* Max players */}
            <div className="space-y-1.5">
              <Label htmlFor="max_players">{t("create.maxPlayers")}</Label>
              <Input
                id="max_players"
                type="number"
                min={4}
                max={100}
                placeholder={t("create.maxPlayersPlaceholder")}
                value={form.max_players}
                onChange={(e) => set("max_players", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t("create.minIs4")}</p>
            </div>

            {/* Visibility */}
            <div className="space-y-1.5">
              <Label>{t("create.visibility")}</Label>
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
                  {t("create.public")}
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
                  {t("create.private")}
                </button>
              </div>
            </div>

            {/* Event Gender + Activity Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("create.eventGender")}</Label>
                <Select value={form.event_gender} onValueChange={(v) => set("event_gender", v as FormState["event_gender"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">{t("create.eventGenderMixed")}</SelectItem>
                    <SelectItem value="women_only">{t("create.eventGenderWomenOnly")}</SelectItem>
                    <SelectItem value="men_only">{t("create.eventGenderMenOnly")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t("create.activityType")}</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => set("activity_type", "indoor")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                      form.activity_type === "indoor"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    <Building className="h-4 w-4" />
                    {t("create.activityTypeIndoor")}
                  </button>
                  <button
                    type="button"
                    onClick={() => set("activity_type", "beach")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                      form.activity_type === "beach"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    <Palmtree className="h-4 w-4" />
                    {t("create.activityTypeBeach")}
                  </button>
                </div>
              </div>
            </div>

            {/* Opponent Mode — only for game-type events with a club */}
            {form.event_type !== "training" && form.club_id && form.club_id !== NO_CLUB && (
              <div className="space-y-2 rounded-xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{t("create.opponentMode")}</p>
                      <p className="text-xs text-muted-foreground">{t("create.opponentModeDesc")}</p>
                    </div>
                  </div>
                  <Switch checked={form.is_opponent_mode} onCheckedChange={(v) => set("is_opponent_mode", v)} />
                </div>
                {form.is_opponent_mode && (
                  <Input
                    placeholder={t("create.opponentTeamNamePlaceholder")}
                    value={form.opponent_team_name}
                    onChange={(e) => set("opponent_team_name", e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>
            )}

            {/* Description / Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">{t("create.description")}</Label>
              <Textarea
                id="notes"
                placeholder={t("create.descriptionPlaceholder")}
                value={form.notes}
                onChange={(e) => {
                  if (e.target.value.length <= 100) set("notes", e.target.value);
                }}
                maxLength={100}
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">
                {form.notes.length}/100
              </p>
            </div>

            {/* Save as template */}
            <div className="space-y-2 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="save-template" className="flex items-center gap-2 cursor-pointer">
                  <Bookmark className="h-4 w-4 text-muted-foreground" />
                  {t("create.saveAsTemplate")}
                </Label>
                <Switch
                  id="save-template"
                  checked={form.save_template}
                  onCheckedChange={(v) => set("save_template", v)}
                />
              </div>
              {form.save_template && (
                <Input
                  placeholder={t("create.templateNamePlaceholder")}
                  value={form.template_name}
                  onChange={(e) => set("template_name", e.target.value)}
                  className="mt-2"
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom action bar — fixed */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-3 bg-background border-t z-40
                   pb-[max(env(safe-area-inset-bottom),12px)]"
      >
        <div className="max-w-2xl mx-auto">
          {step < 3 ? (
            <Button
              className="w-full"
              disabled={!canGoNext()}
              onClick={() => setStep(step + 1)}
            >
              {t("create.continue")}
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          ) : (
            <Button
              className="w-full"
              disabled={createMutation.isPending}
              onClick={handleSubmit}
            >
              {createMutation.isPending ? t("create.creating") : t("create.createEvent")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateEvent;
