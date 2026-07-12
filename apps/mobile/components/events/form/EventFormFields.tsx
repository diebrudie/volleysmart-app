import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  fetchOpponentTeamNames,
  getSupabaseClient,
  type EventGender,
  type EventType,
} from "@volleysmart/core";
import { Chip } from "@/components/ui/Chip";
import { DateField } from "@/components/ui/DateField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TimeField } from "@/components/ui/TimeField";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { icons, type IoniconsName } from "@/constants/icons";
import { queryKeys } from "@/constants/queryKeys";
import { radii, spacing, typography } from "@/constants/theme";

/**
 * Shared controlled event form values.
 *
 * Field names align with what core createPlannedEvent / updatePlannedEvent
 * expect (camelCased): startTime/endTime are "HH:mm", date and rsvpDeadline
 * are JS Dates (converted to "yyyy-MM-dd" / ISO at submit), isIndoor maps to
 * activity_type "indoor" | "beach".
 */
export type EventFormValues = {
  title: string;
  eventType: EventType | null;
  date: Date | null;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  rsvpDeadline: Date | null;
  locationName: string;
  locationAddress: string;
  maxPlayers: number | null;
  isPublic: boolean;
  eventGender: EventGender;
  isIndoor: boolean;
  isOpponentMode: boolean;
  opponentTeamName: string;
  notes: string;
};

export const defaultEventFormValues: EventFormValues = {
  title: "",
  eventType: null,
  date: null,
  startTime: "18:00",
  endTime: "20:00",
  rsvpDeadline: null,
  locationName: "",
  locationAddress: "",
  maxPlayers: null,
  isPublic: true,
  eventGender: "mixed",
  isIndoor: true,
  isOpponentMode: false,
  opponentTeamName: "",
  notes: "",
};

export type EventFormSection = "basics" | "schedule" | "details";

type Props = {
  values: EventFormValues;
  onChange: (patch: Partial<EventFormValues>) => void;
  mode: "create" | "edit";
  /** Which field groups to render. Default: all. */
  sections?: readonly EventFormSection[];
  /** True when a real club (not "personal") is selected — gates opponent mode. */
  hasClub?: boolean;
  /** Club id scoping saved-location suggestions (null = personal event). */
  clubId?: string | null;
};

const NOTES_MAX = 100;
const TITLE_MAX = 50;

/** RSVP presets, mirroring the web page: days before the event date. */
const RSVP_PRESET_DAYS = [0, 1, 3, 7] as const;
const RSVP_CUSTOM = -1;

function computePresetDeadline(date: Date, daysBefore: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - daysBefore);
  d.setHours(23, 59, 0, 0);
  return d;
}

function matchPreset(date: Date | null, deadline: Date | null): number {
  if (!date || !deadline) return RSVP_CUSTOM;
  for (let i = 0; i < RSVP_PRESET_DAYS.length; i++) {
    if (computePresetDeadline(date, RSVP_PRESET_DAYS[i]).getTime() === deadline.getTime()) {
      return i;
    }
  }
  return RSVP_CUSTOM;
}

type LocationRecord = {
  id: string;
  name: string;
  address: string | null;
  club_id: string | null;
};

async function fetchSavedLocations(
  clubId: string | null,
  userId: string
): Promise<LocationRecord[]> {
  const supabase = getSupabaseClient();
  if (clubId) {
    const { data, error } = await supabase
      .from("locations")
      .select("id, name, address, club_id")
      .eq("club_id", clubId)
      .order("name");
    if (error) throw error;
    return (data ?? []) as LocationRecord[];
  }

  // Personal event: locations from all the user's clubs + clubless ones.
  const { data: memberships } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("status", "active");
  const memberClubIds = (memberships ?? [])
    .map((m: { club_id: string | null }) => m.club_id)
    .filter(Boolean) as string[];

  const clubLocsPromise =
    memberClubIds.length > 0
      ? supabase
          .from("locations")
          .select("id, name, address, club_id")
          .in("club_id", memberClubIds)
          .order("name")
      : Promise.resolve({ data: [] as LocationRecord[], error: null });
  const personalLocsPromise = supabase
    .from("locations")
    .select("id, name, address, club_id")
    .is("club_id", null)
    .eq("created_by", userId)
    .order("name");

  const [clubResult, personalResult] = await Promise.all([
    clubLocsPromise,
    personalLocsPromise,
  ]);
  if (clubResult.error) throw clubResult.error;
  if (personalResult.error) throw personalResult.error;

  const all = [
    ...((clubResult.data ?? []) as LocationRecord[]),
    ...((personalResult.data ?? []) as LocationRecord[]),
  ];
  const seen = new Set<string>();
  return all
    .filter((l) => (seen.has(l.id) ? false : (seen.add(l.id), true)))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Controlled, reusable event fieldset shared by the Create Event wizard and
 * the (Wave 2) edit-event sheet. All field UI lives here; club selection,
 * recurrence and template controls are composed around it by the caller.
 */
export function EventFormFields({
  values,
  onChange,
  mode,
  sections = ["basics", "schedule", "details"],
  hasClub = false,
  clubId = null,
}: Props) {
  const { t } = useTranslation("events");
  const theme = useTheme();
  const { user } = useAuth();

  const [rsvpPreset, setRsvpPreset] = useState<number>(() =>
    mode === "edit" ? matchPreset(values.date, values.rsvpDeadline) : 1
  );
  // When true, show free-text name/address inputs to add a brand-new location
  // instead of picking one of the club's saved locations.
  const [addingNewLocation, setAddingNewLocation] = useState(false);

  const showBasics = sections.includes("basics");
  const showSchedule = sections.includes("schedule");
  const showDetails = sections.includes("details");

  // ── Saved locations (suggestions under the name field) ──
  const { data: savedLocations = [] } = useQuery({
    queryKey: queryKeys.events.locations(clubId, user?.id),
    queryFn: () => fetchSavedLocations(clubId, user!.id),
    enabled: showDetails && !!user?.id,
  });

  const showOpponentBlock =
    showDetails && hasClub && values.eventType !== "training";

  const { data: opponentNames = [] } = useQuery({
    queryKey: queryKeys.events.opponentNames(clubId),
    queryFn: () => fetchOpponentTeamNames(clubId!),
    enabled: showOpponentBlock && !!clubId && values.isOpponentMode,
    staleTime: 5 * 60 * 1000,
  });

  // ── Saved-location picker state ──
  // The event type each icon uses is drawn with the glyph the PWA uses:
  // friendly = crossed swords, social = people, training = dumbbell.
  const hasSavedLocations = savedLocations.length > 0;
  const currentIsSaved = savedLocations.some(
    (l) => l.name === values.locationName
  );
  const showLocationInputs = addingNewLocation || !hasSavedLocations;
  const selectedSavedLocation = savedLocations.find(
    (l) => l.name === values.locationName
  );

  // ── Event types (mirrors web EVENT_TYPES) ──
  const eventTypes: {
    value: EventType;
    label: string;
    description: string;
    color: string;
  }[] = [
    {
      value: "friendly_game",
      label: t("create.typeFriendlyGame", { defaultValue: "Friendly Game" }),
      description: t("create.typeFriendlyGameDesc", {
        defaultValue: "Casual match within your club",
      }),
      color: theme.accent,
    },
    {
      value: "social_game",
      label: t("create.typeSocialGame", { defaultValue: "Social Game" }),
      description: t("create.typeSocialGameDesc", {
        defaultValue: "Fun, relaxed — open to all levels",
      }),
      color: theme.success,
    },
    {
      value: "training",
      label: t("create.typeTraining", { defaultValue: "Training" }),
      description: t("create.typeTrainingDesc", {
        defaultValue: "Practice and skill development session",
      }),
      color: theme.secondary,
    },
  ];

  // Per-type icon: friendly uses MaterialCommunityIcons crossed swords
  // (matches the event-detail row); social/training use Ionicons.
  const renderTypeIcon = (value: EventType, color: string) =>
    value === "friendly_game" ? (
      <MaterialCommunityIcons name="sword-cross" size={24} color={color} />
    ) : value === "social_game" ? (
      <Ionicons name={icons.users} size={24} color={color} />
    ) : (
      <Ionicons name={icons.dumbbell} size={24} color={color} />
    );

  // Location select options: saved locations (value = name) + "Add new".
  const ADD_NEW_LOCATION = "__add_new_location__";
  const locationOptions = [
    ...savedLocations.map((l) => ({ label: l.name, value: l.name })),
    // Edit case: the event's current location isn't in the fetched list.
    ...(!addingNewLocation && values.locationName && !currentIsSaved
      ? [{ label: values.locationName, value: values.locationName }]
      : []),
    {
      label: t("location.addNew", { defaultValue: "+ Add new location" }),
      value: ADD_NEW_LOCATION,
    },
  ];
  const locationSelectValue = addingNewLocation
    ? ADD_NEW_LOCATION
    : values.locationName || null;

  const handleLocationSelect = (val: string) => {
    if (val === ADD_NEW_LOCATION) {
      setAddingNewLocation(true);
      onChange({ locationName: "", locationAddress: "" });
      return;
    }
    setAddingNewLocation(false);
    const loc = savedLocations.find((l) => l.name === val);
    if (loc) {
      onChange({ locationName: loc.name, locationAddress: loc.address ?? "" });
    } else {
      onChange({ locationName: val });
    }
  };

  const rsvpPresetOptions = [
    { label: t("create.rsvpSameDay", { defaultValue: "Same day" }), value: 0 },
    { label: t("create.rsvp1DayBefore", { defaultValue: "1 day before" }), value: 1 },
    { label: t("create.rsvp3DaysBefore", { defaultValue: "3 days before" }), value: 2 },
    { label: t("create.rsvp1WeekBefore", { defaultValue: "1 week before" }), value: 3 },
    { label: t("create.rsvpCustom", { defaultValue: "Custom" }), value: RSVP_CUSTOM },
  ];

  const genderOptions = [
    { label: t("create.eventGenderMixed", { defaultValue: "Mixed" }), value: "mixed" },
    { label: t("create.eventGenderWomenOnly", { defaultValue: "Women Only" }), value: "women_only" },
    { label: t("create.eventGenderMenOnly", { defaultValue: "Men Only" }), value: "men_only" },
    { label: t("create.eventGenderQueer", { defaultValue: "Queer" }), value: "queer" },
    { label: t("create.eventGenderFlinta", { defaultValue: "Flinta" }), value: "flinta" },
  ] as const;

  // ── Handlers ──
  const handleDateChange = (d: Date) => {
    const patch: Partial<EventFormValues> = { date: d };
    if (rsvpPreset !== RSVP_CUSTOM) {
      patch.rsvpDeadline = computePresetDeadline(d, RSVP_PRESET_DAYS[rsvpPreset]);
    }
    onChange(patch);
  };

  const handlePresetChange = (preset: number) => {
    setRsvpPreset(preset);
    if (preset === RSVP_CUSTOM) return;
    if (values.date) {
      onChange({
        rsvpDeadline: computePresetDeadline(values.date, RSVP_PRESET_DAYS[preset]),
      });
    }
  };

  const handleCustomDeadline = (d: Date) => {
    const deadline = new Date(d);
    deadline.setHours(23, 59, 0, 0);
    onChange({ rsvpDeadline: deadline });
  };

  const today = new Date();

  return (
    <View style={styles.root}>
      {/* ── Basics: event type selection only ── */}
      {showBasics ? (
        <View style={styles.typeList}>
          {eventTypes.map((type) => {
            const selected = values.eventType === type.value;
            return (
              <Pressable
                key={type.value}
                onPress={() => onChange({ eventType: type.value })}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.typeCard,
                  {
                    borderColor: selected ? type.color : theme.cardBorder,
                    backgroundColor: selected ? theme.muted : theme.card,
                  },
                  pressed && { backgroundColor: theme.surface },
                ]}
              >
                {renderTypeIcon(
                  type.value,
                  selected ? type.color : theme.textSecondary
                )}
                <View style={styles.typeTextCol}>
                  <Text style={[styles.typeLabel, { color: theme.text }]}>
                    {type.label}
                  </Text>
                  <Text
                    style={[styles.typeDesc, { color: theme.mutedForeground }]}
                  >
                    {type.description}
                  </Text>
                </View>
                {selected ? (
                  <Ionicons name={icons.check} size={18} color={type.color} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* ── Schedule: date, times, RSVP deadline ── */}
      {showSchedule ? (
        <>
          <DateField
            label={t("create.dateLabel", { defaultValue: "Date *" })}
            placeholder={t("create.pickDate", { defaultValue: "Pick a date" })}
            value={values.date}
            onChange={handleDateChange}
            minDate={today}
          />

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <TimeField
                label={t("create.startTime", { defaultValue: "Start time *" })}
                value={values.startTime || null}
                onChange={(v) => onChange({ startTime: v })}
              />
            </View>
            <View style={styles.rowItem}>
              <TimeField
                label={t("create.endTime", { defaultValue: "End time *" })}
                value={values.endTime || null}
                onChange={(v) => onChange({ endTime: v })}
              />
            </View>
          </View>

          <Select
            label={t("create.rsvpDeadline", { defaultValue: "RSVP deadline" })}
            options={rsvpPresetOptions}
            value={rsvpPreset}
            onChange={handlePresetChange}
          />
          {rsvpPreset === RSVP_CUSTOM ? (
            <DateField
              placeholder={t("create.pickDeadlineDate", {
                defaultValue: "Pick deadline date",
              })}
              value={values.rsvpDeadline}
              onChange={handleCustomDeadline}
              minDate={today}
            />
          ) : null}
        </>
      ) : null}

      {/* ── Details: name, location, max players, visibility, gender, activity, opponent, notes ── */}
      {showDetails ? (
        <>
          {/* Event name */}
          <Input
            label={t("create.eventName", { defaultValue: "Event name *" })}
            placeholder={t("create.eventNamePlaceholder", {
              defaultValue: "e.g. Saturday Friendly",
            })}
            value={values.title}
            maxLength={TITLE_MAX}
            onChangeText={(text) => onChange({ title: text.slice(0, TITLE_MAX) })}
          />

          {/* Location: pick a saved location, or add a new one */}
          {hasSavedLocations ? (
            <Select
              label={t("location.label", { defaultValue: "Location *" })}
              placeholder={t("location.selectPlaceholder", {
                defaultValue: "Select a location",
              })}
              options={locationOptions}
              value={locationSelectValue}
              onChange={handleLocationSelect}
            />
          ) : null}

          {showLocationInputs ? (
            <>
              <Input
                label={t("location.nameLabel", {
                  defaultValue: "Location Name *",
                })}
                placeholder={t("location.namePlaceholder", {
                  defaultValue: "e.g. Berlin Sports Hall",
                })}
                value={values.locationName}
                onChangeText={(text) => onChange({ locationName: text })}
              />
              <Input
                label={t("location.addressLabel", { defaultValue: "Address" })}
                placeholder={t("location.addressPlaceholder", {
                  defaultValue: "Search for an address...",
                })}
                value={values.locationAddress}
                onChangeText={(text) => onChange({ locationAddress: text })}
              />
            </>
          ) : selectedSavedLocation?.address ? (
            <View style={styles.selectedAddressRow}>
              <Ionicons
                name={icons.mapPin}
                size={14}
                color={theme.mutedForeground}
              />
              <Text
                style={[styles.selectedAddress, { color: theme.mutedForeground }]}
              >
                {selectedSavedLocation.address}
              </Text>
            </View>
          ) : null}

          {/* Max players */}
          <Input
            label={t("create.maxPlayers", { defaultValue: "Max players (optional)" })}
            placeholder={t("create.maxPlayersPlaceholder", { defaultValue: "e.g. 12" })}
            keyboardType="number-pad"
            value={values.maxPlayers !== null ? String(values.maxPlayers) : ""}
            onChangeText={(text) => {
              const digits = text.replace(/[^0-9]/g, "");
              onChange({ maxPlayers: digits ? parseInt(digits, 10) : null });
            }}
          />
          <Text style={[styles.hint, { color: theme.mutedForeground }]}>
            {t("create.minIs4", { defaultValue: "Minimum is 4" })}
          </Text>

          {/* Visibility */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.groupLabel, { color: theme.textSecondary }]}>
              {t("create.visibility", { defaultValue: "Visibility" })}
            </Text>
            <View style={styles.row}>
              <ToggleOption
                label={t("create.public", { defaultValue: "Public" })}
                icon={icons.globe}
                selected={values.isPublic}
                onPress={() => onChange({ isPublic: true })}
              />
              <ToggleOption
                label={t("create.private", { defaultValue: "Private" })}
                icon={icons.lock}
                selected={!values.isPublic}
                onPress={() => onChange({ isPublic: false })}
              />
            </View>
          </View>

          {/* Gender */}
          <Select
            label={t("create.eventGender", { defaultValue: "Gender" })}
            options={genderOptions}
            value={values.eventGender}
            onChange={(v) => onChange({ eventGender: v as EventGender })}
          />

          {/* Activity type */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.groupLabel, { color: theme.textSecondary }]}>
              {t("create.activityType", { defaultValue: "Activity" })}
            </Text>
            <View style={styles.row}>
              <ToggleOption
                label={t("create.activityTypeIndoor", { defaultValue: "Indoor" })}
                icon={icons.building2}
                selected={values.isIndoor}
                onPress={() => onChange({ isIndoor: true })}
              />
              <ToggleOption
                label={t("create.activityTypeBeach", { defaultValue: "Beach" })}
                icon={icons.sun}
                selected={!values.isIndoor}
                onPress={() => onChange({ isIndoor: false })}
              />
            </View>
          </View>

          {/* Opponent mode — game-type events with a club only */}
          {showOpponentBlock ? (
            <View
              style={[
                styles.blockCard,
                { borderColor: theme.cardBorder, backgroundColor: theme.card },
              ]}
            >
              <View style={styles.blockHeader}>
                <Ionicons
                  name={icons.shield}
                  size={18}
                  color={theme.textSecondary}
                />
                <View style={styles.blockTextCol}>
                  <Text style={[styles.blockTitle, { color: theme.text }]}>
                    {t("create.opponentMode", { defaultValue: "Opponent mode" })}
                  </Text>
                  <Text
                    style={[styles.blockDesc, { color: theme.mutedForeground }]}
                  >
                    {t("create.opponentModeDesc", {
                      defaultValue: "Play as one club team against an external opponent",
                    })}
                  </Text>
                </View>
                <Switch
                  value={values.isOpponentMode}
                  onValueChange={(v) => onChange({ isOpponentMode: v })}
                  trackColor={{ false: theme.muted, true: theme.primary }}
                  thumbColor={theme.background}
                />
              </View>
              {values.isOpponentMode ? (
                <>
                  <Input
                    placeholder={t("create.opponentTeamNamePlaceholder", {
                      defaultValue: "Opponent team name",
                    })}
                    value={values.opponentTeamName}
                    onChangeText={(text) => onChange({ opponentTeamName: text })}
                  />
                  {opponentNames.length > 0 ? (
                    <View style={styles.chipRow}>
                      {opponentNames.slice(0, 6).map((name) => (
                        <Chip
                          key={name}
                          label={name}
                          selected={values.opponentTeamName === name}
                          onPress={() => onChange({ opponentTeamName: name })}
                        />
                      ))}
                    </View>
                  ) : null}
                </>
              ) : null}
            </View>
          ) : null}

          {/* Notes with 100-char counter */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.groupLabel, { color: theme.textSecondary }]}>
              {t("create.description", { defaultValue: "Description (optional)" })}
            </Text>
            <TextInput
              multiline
              maxLength={NOTES_MAX}
              placeholder={t("create.descriptionPlaceholder", {
                defaultValue: "Any extra info for participants…",
              })}
              placeholderTextColor={theme.placeholder}
              value={values.notes}
              onChangeText={(text) => onChange({ notes: text.slice(0, NOTES_MAX) })}
              style={[
                styles.notesInput,
                {
                  borderColor: theme.inputBorder,
                  backgroundColor: theme.inputBackground,
                  color: theme.text,
                },
              ]}
            />
            <Text style={[styles.counter, { color: theme.mutedForeground }]}>
              {values.notes.length}/{NOTES_MAX}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

function ToggleOption({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: IoniconsName;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.toggleOption,
        {
          borderColor: selected ? theme.primary : theme.cardBorder,
          backgroundColor: selected ? theme.muted : theme.card,
        },
        pressed && { backgroundColor: theme.surface },
      ]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={selected ? theme.primary : theme.textSecondary}
      />
      <Text
        numberOfLines={1}
        style={[
          styles.toggleLabel,
          { color: selected ? theme.primary : theme.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  typeList: { gap: spacing.md },
  typeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 2,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  typeTextCol: { flex: 1, gap: 2 },
  typeLabel: { ...typography.h3 },
  typeDesc: { ...typography.caption },
  row: { flexDirection: "row", gap: spacing.md },
  rowItem: { flex: 1 },
  fieldGroup: { gap: spacing.xs },
  groupLabel: { fontSize: 14, fontWeight: "500", marginBottom: 2 },
  hint: { ...typography.caption, marginTop: -spacing.md },
  selectedAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: -spacing.sm,
  },
  selectedAddress: { ...typography.caption, flex: 1 },
  toggleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  toggleLabel: { ...typography.bodySm, fontWeight: "600" },
  blockCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  blockTextCol: { flex: 1, gap: 2 },
  blockTitle: { ...typography.bodySm, fontWeight: "600" },
  blockDesc: { ...typography.caption },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: radii.lg,
    minHeight: 80,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    fontSize: 16,
    textAlignVertical: "top",
  },
  counter: { ...typography.caption, textAlign: "right" },
});
