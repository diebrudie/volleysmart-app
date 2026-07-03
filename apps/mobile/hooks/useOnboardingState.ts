import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  createPlayer,
  getAllPositions,
  getSupabaseClient,
} from "@volleysmart/core";
import { useAuth } from "@/hooks/useAuth";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { queryKeys } from "@/constants/queryKeys";
import { getPendingInviteToken } from "@/constants/pendingInvite";
import { toast } from "@/components/ui/Toast";

export type GenderType = "male" | "female" | "other" | "diverse";
export type SkillLevelType =
  | "just-starting"
  | "intermediate"
  | "advanced"
  | "competitive";
export type TrainingStatusType = "no" | "used-to" | "currently";
export type CompetitionLevelType =
  | "casual"
  | "friendly"
  | "amateur"
  | "federated";
export type GamePerformanceType =
  | "basic-contact"
  | "consistent-play"
  | "tactical-aware"
  | "advanced-skills"
  | "competitive-level";
export type MatchExperienceType = "none" | "few" | "some" | "many" | "extensive";

export interface OnboardingAnswers {
  primaryPosition: string;
  secondaryPositions: string[];
  generalSkillLevel: SkillLevelType | "";
  trainingStatus: TrainingStatusType | "";
  competitionLevel: CompetitionLevelType | "";
  gamePerformance: GamePerformanceType | "";
  matchExperience: MatchExperienceType | "";
  /** ISO date string YYYY-MM-DD. */
  birthday: string;
  height?: number;
  gender: GenderType;
}

export type PositionOption = { id: string; name: string };

/** Wizard step count — mirrors apps/web/src/pages/PlayerOnboarding.tsx. */
export const TOTAL_ONBOARDING_STEPS = 13;

/**
 * Skill score initialization on a 1-100 scale.
 * Byte-for-byte port of the web PlayerOnboarding math: the onboarding base
 * score is capped at 75 — the remaining 25 points come from gameplay
 * progression. Floor is 15.
 */
export function calculateSkillLevel(answers: OnboardingAnswers): number {
  let totalScore = 0;

  const skillScores: Record<SkillLevelType, number> = {
    "just-starting": 4,
    intermediate: 11,
    advanced: 19,
    competitive: 23,
  };
  totalScore += skillScores[answers.generalSkillLevel as SkillLevelType] || 4;

  const performanceScores: Record<GamePerformanceType, number> = {
    "basic-contact": 4,
    "consistent-play": 8,
    "tactical-aware": 11,
    "advanced-skills": 15,
    "competitive-level": 19,
  };
  totalScore +=
    performanceScores[answers.gamePerformance as GamePerformanceType] || 4;

  const competitionScores: Record<CompetitionLevelType, number> = {
    casual: 4,
    friendly: 8,
    amateur: 11,
    federated: 15,
  };
  totalScore +=
    competitionScores[answers.competitionLevel as CompetitionLevelType] || 4;

  const trainingScores: Record<TrainingStatusType, number> = {
    no: 2,
    "used-to": 6,
    currently: 11,
  };
  totalScore +=
    trainingScores[answers.trainingStatus as TrainingStatusType] || 2;

  const experienceScores: Record<MatchExperienceType, number> = {
    none: 1,
    few: 3,
    some: 5,
    many: 6,
    extensive: 7,
  };
  totalScore +=
    experienceScores[answers.matchExperience as MatchExperienceType] || 1;

  return Math.max(15, Math.min(75, totalScore));
}


function toDateString(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function useOnboardingState() {
  const { t } = useTranslation("onboarding");
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { pickAndUpload, uploading } = useMediaUpload();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Name fields — pre-filled from OAuth/email metadata; editable in step 0 if missing.
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [namesAutoFilled, setNamesAutoFilled] = useState(false);

  // City step — free-text city + country (mobile has no Mapbox autocomplete).
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");

  // Photo — uploaded on pick (public URL kept until submit).
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const [answers, setAnswers] = useState<OnboardingAnswers>({
    primaryPosition: "",
    secondaryPositions: [],
    generalSkillLevel: "",
    trainingStatus: "",
    competitionLevel: "",
    gamePerformance: "",
    matchExperience: "",
    birthday: "2000-01-01",
    gender: "other",
  });

  // Pre-fill names from auth metadata — email sign-up and all OAuth providers.
  useEffect(() => {
    const m = (user?.user_metadata ?? {}) as Record<string, unknown>;
    let fn = String(m.first_name ?? m.given_name ?? "");
    let ln = String(m.last_name ?? m.family_name ?? "");
    if (!fn || !ln) {
      const full = String(m.full_name ?? m.name ?? "");
      if (full.trim()) {
        const parts = full.trim().split(/\s+/);
        if (!fn) fn = parts[0] ?? "";
        if (!ln) ln = parts.slice(1).join(" ") || "";
      }
    }
    setFirstName(fn);
    setLastName(ln);
    setNamesAutoFilled(!!(fn.trim() && ln.trim()));
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const positionsQuery = useQuery({
    queryKey: queryKeys.positions.all,
    queryFn: getAllPositions,
    staleTime: 30 * 60 * 1000,
  });

  const positions: PositionOption[] = useMemo(
    () =>
      [...(positionsQuery.data ?? [])]
        .map((p) => ({ id: p.id, name: p.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [positionsQuery.data]
  );

  const setAnswer = useCallback(
    <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => {
      setAnswers((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  /** Selecting a primary position removes it from the secondary picks. */
  const setPrimaryPosition = useCallback((positionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      primaryPosition: positionId,
      secondaryPositions: prev.secondaryPositions.filter(
        (id) => id !== positionId
      ),
    }));
  }, []);

  const toggleSecondaryPosition = useCallback((positionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      secondaryPositions: prev.secondaryPositions.includes(positionId)
        ? prev.secondaryPositions.filter((id) => id !== positionId)
        : [...prev.secondaryPositions, positionId],
    }));
  }, []);

  // Birthday must be at least 10 years in the past (web uses a max attr).
  const maxBirthday = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 10);
    return d;
  }, []);

  const birthdayDate = useMemo(
    () => (answers.birthday ? new Date(`${answers.birthday}T00:00:00`) : null),
    [answers.birthday]
  );

  const setBirthday = useCallback((date: Date) => {
    setAnswers((prev) => ({ ...prev, birthday: toDateString(date) }));
  }, []);

  const birthdayTooRecent =
    birthdayDate !== null && birthdayDate.getTime() > maxBirthday.getTime();

  // Per-step validation — mirrors web isStepValid.
  const isStepValid = useCallback(
    (step: number): boolean => {
      switch (step) {
        case 0:
          return (
            namesAutoFilled ||
            (firstName.trim() !== "" && lastName.trim() !== "")
          );
        case 1:
          return answers.primaryPosition !== "";
        case 2:
          return answers.secondaryPositions.length > 0;
        case 3:
          return answers.generalSkillLevel !== "";
        case 4:
          return answers.trainingStatus !== "";
        case 5:
          return answers.competitionLevel !== "";
        case 6:
          return answers.gamePerformance !== "";
        case 7:
          return answers.matchExperience !== "";
        case 8:
          return (
            !!answers.height && answers.height >= 110 && answers.height <= 220
          );
        case 9:
          return !birthdayTooRecent;
        case 10:
          return city.trim() !== "";
        case 11:
          return true; // Gender has a default
        case 12:
          return true; // Photo is optional
        default:
          return true;
      }
    },
    [answers, firstName, lastName, namesAutoFilled, city, birthdayTooRecent]
  );

  const nextStep = useCallback(() => {
    setCurrentStep((s) =>
      s < TOTAL_ONBOARDING_STEPS - 1 && isStepValid(s) ? s + 1 : s
    );
  }, [isStepValid]);

  const prevStep = useCallback(() => {
    setCurrentStep((s) => (s > 0 ? s - 1 : s));
  }, []);

  const pickPhoto = useCallback(async () => {
    if (!user?.id) return;
    try {
      const url = await pickAndUpload("player-images", `${user.id}-`);
      if (url) setPhotoUrl(url);
    } catch {
      // Web parity: image upload failure is non-fatal.
      toast(
        t("toast.imageUploadFailed", {
          defaultValue:
            "Image upload failed, but profile will be created without photo.",
        }),
        "info"
      );
    }
  }, [user?.id, pickAndUpload, t]);

  const removePhoto = useCallback(() => setPhotoUrl(null), []);

  const submit = useCallback(async () => {
    if (!user?.id || isSubmitting) return;

    const requiredOk =
      answers.primaryPosition &&
      answers.secondaryPositions.length > 0 &&
      answers.generalSkillLevel &&
      answers.trainingStatus &&
      answers.competitionLevel &&
      answers.gamePerformance &&
      answers.matchExperience &&
      answers.height &&
      city.trim();

    if (!requiredOk) {
      toast(
        t("toast.answerAllRequired", {
          defaultValue: "Please answer all required questions",
        }),
        "error"
      );
      return;
    }

    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn || !ln) {
      toast(
        t("toast.enterName", {
          defaultValue: "Please enter your first and last name to continue.",
        }),
        "error"
      );
      setCurrentStep(0);
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = getSupabaseClient();

      const { data: existing } = await supabase
        .from("players")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        toast(
          t("toast.profileExists", {
            defaultValue: "Player profile already exists!",
          }),
          "info"
        );
        queryClient.setQueryData(
          queryKeys.profile.currentPlayerId(user.id),
          existing.id
        );
        // Pending invite deep link takes precedence over the tabs
      // (web PlayerOnboarding.tsx pendingInviteToken redirect).
      const pendingToken = await getPendingInviteToken();
      if (pendingToken) {
        router.replace(`/invite/${encodeURIComponent(pendingToken)}`);
      } else {
        router.replace("/(tabs)");
      }
        return;
      }

      const skill = calculateSkillLevel(answers);

      // Core call creates the players row plus primary/secondary
      // player_positions rows.
      const player = await createPlayer(user.id, {
        first_name: fn,
        last_name: ln,
        image_url: photoUrl ?? undefined,
        skill_rating: skill,
        gender: answers.gender,
        birthday: answers.birthday || undefined,
        primary_position: answers.primaryPosition,
        secondary_positions: answers.secondaryPositions,
      });

      // Parity fields the core createPlayer signature does not cover
      // (web PlayerOnboarding inserts these directly).
      const { error: extraError } = await supabase
        .from("players")
        .update({
          rating_history: [
            {
              date: new Date().toISOString(),
              rating: skill,
              type: "onboarding",
            },
          ],
          general_skill_level: answers.generalSkillLevel,
          training_status: answers.trainingStatus,
          competition_level: answers.competitionLevel,
          game_performance: answers.gamePerformance,
          match_experience: answers.matchExperience,
          height_cm: answers.height ?? null,
          city: city.trim() || null,
          country: country.trim() || null,
          profile_completed: true,
        })
        .eq("id", player.id);

      if (extraError) {
        // Non-fatal: the profile exists; details can be edited later.
        console.warn("Onboarding detail update failed:", extraError.message);
      }

      // Seed the player-row cache BEFORE navigating so AuthProvider's
      // no-player guard does not bounce the user back to /onboarding.
      queryClient.setQueryData(
        queryKeys.profile.currentPlayerId(user.id),
        player.id
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.profile.player(user.id),
      });

      toast(
        t("toast.profileCreated", {
          defaultValue: "Player profile created! Skill level: {{level}}/100",
          level: skill,
        })
      );
      // Pending invite deep link takes precedence over the tabs
      // (web PlayerOnboarding.tsx pendingInviteToken redirect).
      const pendingToken = await getPendingInviteToken();
      if (pendingToken) {
        router.replace(`/invite/${encodeURIComponent(pendingToken)}`);
      } else {
        router.replace("/(tabs)");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred";
      toast(
        t("toast.createFailed", {
          defaultValue: "Failed to create player profile: {{error}}",
          error: message,
        }),
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    user?.id,
    isSubmitting,
    answers,
    firstName,
    lastName,
    city,
    country,
    photoUrl,
    queryClient,
    router,
    t,
  ]);

  return {
    // wizard
    currentStep,
    totalSteps: TOTAL_ONBOARDING_STEPS,
    nextStep,
    prevStep,
    isStepValid,
    isLastStep: currentStep === TOTAL_ONBOARDING_STEPS - 1,
    submit,
    isSubmitting,
    // data
    positions,
    positionsLoading: positionsQuery.isPending,
    answers,
    setAnswer,
    setPrimaryPosition,
    toggleSecondaryPosition,
    // name
    firstName,
    lastName,
    setFirstName,
    setLastName,
    namesAutoFilled,
    // birthday
    birthdayDate,
    setBirthday,
    birthdayTooRecent,
    // city
    city,
    setCity,
    country,
    setCountry,
    // photo
    photoUrl,
    pickPhoto,
    removePhoto,
    uploading,
  };
}
