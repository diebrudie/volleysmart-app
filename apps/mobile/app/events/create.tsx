import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { getSupabaseClient, type EventTemplate } from "@volleysmart/core";
import {
  EventFormFields,
  defaultEventFormValues,
  type EventFormValues,
} from "@/components/events/form/EventFormFields";
import {
  RecurrenceFields,
  defaultRecurrenceValues,
  type RecurrenceValues,
} from "@/components/events/form/RecurrenceFields";
import { TemplatePicker } from "@/components/events/form/TemplatePicker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { KeyboardAwareScreen } from "@/components/ui/KeyboardAwareScreen";
import { Select } from "@/components/ui/Select";
import { StepperHeader } from "@/components/ui/StepperHeader";
import { toast } from "@/components/ui/Toast";
import { useCreateEvent } from "@/hooks/useCreateEvent";
import { useTheme } from "@/hooks/useTheme";
import { useUserClubs } from "@/hooks/useUserClubs";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";

// Sentinel for "personal event, no club" — same as the web page.
const NO_CLUB = "__none__";

const TOTAL_STEPS = 4;

/**
 * Create Event wizard, mirroring apps/web/src/pages/CreateEvent.tsx on
 * a 4-step phone layout: basics (type/title/club + templates) → schedule
 * (date/times/RSVP deadline/recurrence) → details (location, max players,
 * visibility, gender, activity, opponent mode, notes, save-as-template)
 * → review & submit.
 */
export default function CreateEventScreen() {
  const { t, i18n } = useTranslation("events");
  const theme = useTheme();
  const router = useRouter();
  const { clubId: preselectedClubId } = useLocalSearchParams<{
    clubId?: string;
  }>();

  const [step, setStep] = useState(1);
  const [values, setValues] = useState<EventFormValues>(defaultEventFormValues);
  const [recurrence, setRecurrence] = useState<RecurrenceValues>(
    defaultRecurrenceValues
  );
  const [clubId, setClubId] = useState(""); // "" = not chosen yet
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const { data: memberClubs = [] } = useUserClubs();
  const createEvent = useCreateEvent();

  const patchValues = (patch: Partial<EventFormValues>) =>
    setValues((prev) => ({ ...prev, ...patch }));
  const patchRecurrence = (patch: Partial<RecurrenceValues>) =>
    setRecurrence((prev) => ({ ...prev, ...patch }));

  const clubs = memberClubs
    .map((m) => m.clubs)
    .filter((c): c is NonNullable<typeof c> => !!c);

  // Pre-select club: prefer ?clubId= param, then first club, then NO_CLUB.
  useEffect(() => {
    if (clubId) return;
    if (preselectedClubId && clubs.some((c) => c.id === preselectedClubId)) {
      setClubId(preselectedClubId);
    } else if (clubs.length > 0) {
      setClubId(clubs[0].id);
    } else if (memberClubs.length === 0) {
      setClubId(NO_CLUB);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberClubs, preselectedClubId, clubId]);

  const resolvedClubId = clubId === NO_CLUB ? null : clubId || null;

  const clubOptions = [
    {
      label: t("create.noClubPersonal", {
        defaultValue: "No club — personal event",
      }),
      value: NO_CLUB,
    },
    ...clubs.map((c) => ({ label: c.name, value: c.id })),
  ];

  const stepTitles: Record<number, string> = {
    1: t("create.stepChooseType", { defaultValue: "Choose event type" }),
    2: t("create.stepSchedule", { defaultValue: "Schedule" }),
    3: t("create.stepDetails", { defaultValue: "Details" }),
    4: t("create.stepReview", { defaultValue: "Review" }),
  };

  const canContinue = (): boolean => {
    if (step === 1) return !!values.eventType;
    if (step === 2) return !!values.date && !!values.startTime && !!values.endTime;
    if (step === 3)
      return !!values.title.trim() && !!clubId && !!values.locationName.trim();
    return true;
  };

  const handleBack = () => {
    if (step === 1) router.back();
    else setStep(step - 1);
  };

  // Apply a template to the form (mirrors web applyTemplate).
  const applyTemplate = (template: EventTemplate) => {
    const c = template.config;
    setValues((prev) => ({
      ...prev,
      eventType: c.event_type ?? prev.eventType,
      title: c.title ?? prev.title,
      startTime: c.start_time ?? prev.startTime,
      endTime: c.end_time ?? prev.endTime,
      maxPlayers: c.max_players ?? prev.maxPlayers,
      isPublic: c.is_public ?? prev.isPublic,
      notes: c.notes ?? prev.notes,
    }));
    if (template.club_id) setClubId(template.club_id);
    // Hydrate location name/address from the template's saved location.
    if (c.location_id) {
      getSupabaseClient()
        .from("locations")
        .select("name, address")
        .eq("id", c.location_id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            patchValues({
              locationName: data.name ?? "",
              locationAddress: data.address ?? "",
            });
          }
        });
    }
    setTemplatesOpen(false);
    toast(
      t("create.templateApplied", {
        defaultValue: 'Template "{{name}}" applied',
        name: template.name,
      })
    );
    if (c.event_type) setStep(2);
  };

  const handleSubmit = () => {
    if (!values.eventType || !values.date || !values.title.trim()) {
      toast(
        t("create.errorRequired", {
          defaultValue: "Please fill in all required fields.",
        }),
        "error"
      );
      return;
    }
    if (!clubId) {
      toast(
        t("create.errorSelectClub", {
          defaultValue: "Please select a club or choose 'No club'.",
        }),
        "error"
      );
      return;
    }

    createEvent.mutate(
      {
        values,
        clubId: resolvedClubId,
        recurrenceRule: recurrence.rule,
        saveTemplateName: saveTemplate ? templateName : null,
      },
      {
        onSuccess: (result) => {
          // ?created=true triggers the success dialog on the detail screen
          // (mirrors web CreateEvent success dialog).
          router.replace(`/events/${result.id}?created=true`);
        },
        onError: () => {
          toast(
            t("create.errorCreateFailed", {
              defaultValue: "Failed to create event. Please try again.",
            }),
            "error"
          );
        },
      }
    );
  };

  const locale = i18n.language;
  const formatDate = (d: Date | null) =>
    d
      ? d.toLocaleDateString(locale, {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  const selectedClubName =
    clubId === NO_CLUB
      ? t("create.noClubPersonal", { defaultValue: "No club — personal event" })
      : clubs.find((c) => c.id === clubId)?.name ?? "—";

  const eventTypeLabel =
    values.eventType === "friendly_game"
      ? t("create.typeFriendlyGame", { defaultValue: "Friendly Game" })
      : values.eventType === "social_game"
        ? t("create.typeSocialGame", { defaultValue: "Social Game" })
        : values.eventType === "training"
          ? t("create.typeTraining", { defaultValue: "Training" })
          : "—";

  const genderLabel = {
    mixed: t("create.eventGenderMixed", { defaultValue: "Mixed" }),
    women_only: t("create.eventGenderWomenOnly", { defaultValue: "Women Only" }),
    men_only: t("create.eventGenderMenOnly", { defaultValue: "Men Only" }),
    queer: t("create.eventGenderQueer", { defaultValue: "Queer" }),
    flinta: t("create.eventGenderFlinta", { defaultValue: "Flinta" }),
  }[values.eventGender];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAwareScreen>
        <StepperHeader
          step={step}
          totalSteps={TOTAL_STEPS}
          title={stepTitles[step]}
          onBack={handleBack}
          style={styles.stepper}
        />

        <View style={styles.content}>
          {/* ── Step 1: event type selection + templates ── */}
          {step === 1 ? (
            <>
              <EventFormFields
                values={values}
                onChange={patchValues}
                mode="create"
                sections={["basics"]}
              />

              {/* Templates entry */}
              <Pressable
                onPress={() => setTemplatesOpen(true)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.templatesCard,
                  {
                    borderColor: theme.cardBorder,
                    backgroundColor: pressed ? theme.surface : theme.muted,
                  },
                ]}
              >
                <Ionicons
                  name={icons.layoutGrid}
                  size={24}
                  color={theme.textSecondary}
                />
                <View style={styles.templatesTextCol}>
                  <Text style={[styles.templatesTitle, { color: theme.text }]}>
                    {t("create.templates", { defaultValue: "Templates" })}
                  </Text>
                  <Text
                    style={[
                      styles.templatesDesc,
                      { color: theme.mutedForeground },
                    ]}
                  >
                    {t("create.templatesDesc", {
                      defaultValue: "Start from a saved template",
                    })}
                  </Text>
                </View>
                <Ionicons
                  name={icons.chevronRight}
                  size={18}
                  color={theme.textSecondary}
                />
              </Pressable>

              <TemplatePicker
                visible={templatesOpen}
                onClose={() => setTemplatesOpen(false)}
                onApply={applyTemplate}
              />
            </>
          ) : null}

          {/* ── Step 2: schedule + recurrence ── */}
          {step === 2 ? (
            <>
              <EventFormFields
                values={values}
                onChange={patchValues}
                mode="create"
                sections={["schedule"]}
              />
              <RecurrenceFields
                value={recurrence}
                onChange={patchRecurrence}
                eventDate={values.date}
              />
            </>
          ) : null}

          {/* ── Step 3: details (name + club) + save-as-template ── */}
          {step === 3 ? (
            <>
              <Select
                label={t("create.clubLabel", { defaultValue: "Club" })}
                options={clubOptions}
                value={clubId || NO_CLUB}
                onChange={(v) => setClubId(v)}
              />
              <EventFormFields
                values={values}
                onChange={patchValues}
                mode="create"
                sections={["details"]}
                hasClub={!!resolvedClubId}
                clubId={resolvedClubId}
              />

              {/* Save as template */}
              <View
                style={[
                  styles.templateSaveCard,
                  { borderColor: theme.cardBorder, backgroundColor: theme.card },
                ]}
              >
                <View style={styles.templateSaveHeader}>
                  <Ionicons
                    name={icons.star}
                    size={18}
                    color={theme.textSecondary}
                  />
                  <Text
                    style={[styles.templateSaveTitle, { color: theme.text }]}
                  >
                    {t("create.saveAsTemplate", {
                      defaultValue: "Save as template",
                    })}
                  </Text>
                  <Switch
                    value={saveTemplate}
                    onValueChange={setSaveTemplate}
                    trackColor={{ false: theme.muted, true: theme.primary }}
                    thumbColor={theme.background}
                  />
                </View>
                {saveTemplate ? (
                  <Input
                    placeholder={t("create.templateNamePlaceholder", {
                      defaultValue: "Template name, e.g. Thursday Training",
                    })}
                    value={templateName}
                    onChangeText={setTemplateName}
                  />
                ) : null}
              </View>
            </>
          ) : null}

          {/* ── Step 4: review ── */}
          {step === 4 ? (
            <View
              style={[
                styles.reviewCard,
                { borderColor: theme.cardBorder, backgroundColor: theme.card },
              ]}
            >
              <ReviewRow
                label={t("create.reviewType", { defaultValue: "Event type" })}
                value={eventTypeLabel}
              />
              <ReviewRow
                label={t("create.reviewName", { defaultValue: "Name" })}
                value={values.title || "—"}
              />
              <ReviewRow
                label={t("create.clubLabel", { defaultValue: "Club" })}
                value={selectedClubName}
              />
              <ReviewRow
                label={t("create.reviewDate", { defaultValue: "Date" })}
                value={formatDate(values.date)}
              />
              <ReviewRow
                label={t("create.reviewTime", { defaultValue: "Time" })}
                value={`${values.startTime} – ${values.endTime}`}
              />
              <ReviewRow
                label={t("create.rsvpDeadline", { defaultValue: "RSVP deadline" })}
                value={formatDate(values.rsvpDeadline)}
              />
              <ReviewRow
                label={t("create.reviewRecurrence", { defaultValue: "Repeats" })}
                value={
                  recurrence.rule === "weekly"
                    ? t("create.weekly", { defaultValue: "Weekly" })
                    : recurrence.rule === "monthly"
                      ? t("create.monthly", { defaultValue: "Monthly" })
                      : t("create.doesNotRepeat", {
                          defaultValue: "Does not repeat",
                        })
                }
              />
              <ReviewRow
                label={t("create.reviewLocation", { defaultValue: "Location" })}
                value={
                  values.locationName
                    ? `${values.locationName}${
                        values.locationAddress
                          ? `, ${values.locationAddress}`
                          : ""
                      }`
                    : "—"
                }
              />
              <ReviewRow
                label={t("create.reviewMaxPlayers", { defaultValue: "Max players" })}
                value={values.maxPlayers !== null ? String(values.maxPlayers) : "—"}
              />
              <ReviewRow
                label={t("create.visibility", { defaultValue: "Visibility" })}
                value={
                  values.isPublic
                    ? t("create.public", { defaultValue: "Public" })
                    : t("create.private", { defaultValue: "Private" })
                }
              />
              <ReviewRow
                label={t("create.eventGender", { defaultValue: "Gender" })}
                value={genderLabel}
              />
              <ReviewRow
                label={t("create.activityType", { defaultValue: "Activity" })}
                value={
                  values.isIndoor
                    ? t("create.activityTypeIndoor", { defaultValue: "Indoor" })
                    : t("create.activityTypeBeach", { defaultValue: "Beach" })
                }
              />
              {resolvedClubId && values.isOpponentMode ? (
                <ReviewRow
                  label={t("create.opponentMode", { defaultValue: "Opponent mode" })}
                  value={values.opponentTeamName || "—"}
                />
              ) : null}
              {values.notes ? (
                <ReviewRow
                  label={t("create.description", {
                    defaultValue: "Description (optional)",
                  })}
                  value={values.notes}
                  last
                />
              ) : null}
            </View>
          ) : null}

          {/* ── Bottom action ── */}
          {step < TOTAL_STEPS ? (
            <Button
              title={t("create.continue", { defaultValue: "Continue" })}
              onPress={() => setStep(step + 1)}
              disabled={!canContinue()}
              style={styles.actionButton}
            />
          ) : (
            <Button
              title={
                createEvent.isPending
                  ? t("create.creating", { defaultValue: "Creating…" })
                  : t("create.createEvent", { defaultValue: "Create Event" })
              }
              onPress={handleSubmit}
              loading={createEvent.isPending}
              style={styles.actionButton}
            />
          )}
        </View>
      </KeyboardAwareScreen>
    </>
  );
}

function ReviewRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.reviewRow,
        !last && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.border,
        },
      ]}
    >
      <Text style={[styles.reviewLabel, { color: theme.mutedForeground }]}>
        {label}
      </Text>
      <Text style={[styles.reviewValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: { marginBottom: spacing.lg },
  content: { gap: spacing.lg },
  templatesCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 2,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  templatesTextCol: { flex: 1, gap: 2 },
  templatesTitle: { ...typography.h3 },
  templatesDesc: { ...typography.caption },
  templateSaveCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  templateSaveHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  templateSaveTitle: {
    ...typography.bodySm,
    fontWeight: "600",
    flex: 1,
  },
  reviewCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  reviewLabel: { ...typography.bodySm },
  reviewValue: {
    ...typography.bodySm,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "right",
  },
  actionButton: { marginTop: spacing.sm },
});
