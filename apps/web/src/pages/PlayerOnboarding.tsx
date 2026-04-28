import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload,
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  MapPin,
} from "lucide-react";
import CityLocationSelector, {
  type LocationValue,
} from "@/components/forms/CityLocationSelector";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useIsCompact } from "@/hooks/use-compact";

interface Position {
  id: string;
  name: string;
}

type GenderType = "male" | "female" | "other" | "diverse";
type SkillLevelType =
  | "just-starting"
  | "intermediate"
  | "advanced"
  | "competitive";
type TrainingStatusType = "no" | "used-to" | "currently";
type CompetitionLevelType = "casual" | "friendly" | "amateur" | "federated";
type GamePerformanceType =
  | "basic-contact"
  | "consistent-play"
  | "tactical-aware"
  | "advanced-skills"
  | "competitive-level";
type MatchExperienceType = "none" | "few" | "some" | "many" | "extensive";

interface OnboardingAnswers {
  primaryPosition: string;
  secondaryPositions: string[];
  generalSkillLevel: SkillLevelType | "";
  trainingStatus: TrainingStatusType | "";
  competitionLevel: CompetitionLevelType | "";
  gamePerformance: GamePerformanceType | "";
  matchExperience: MatchExperienceType | "";
  birthday: string;
  height?: number;
  gender: GenderType;
}

// Updated skill calculation function for 1-100 scale
// Onboarding base score capped at 75 — remaining 25 points come from gameplay progression
const calculateSkillLevel = (answers: OnboardingAnswers): number => {
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

  const finalRating = Math.max(15, Math.min(75, totalScore));
  return finalRating;
};

const PlayerOnboarding = () => {
  const { t } = useTranslation("onboarding");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isCompact = useIsCompact();

  const [positions, setPositions] = useState<Position[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isPositionsHelpOpen, setIsPositionsHelpOpen] =
    useState<boolean>(false);
  const [cityLocation, setCityLocation] = useState<LocationValue | null>(null);

  // Name fields — pre-filled from OAuth/email metadata; editable in step 0 if missing.
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  // True when both names were successfully extracted from user metadata.
  const [namesAutoFilled, setNamesAutoFilled] = useState(false);

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

  // Total number of steps (association membership removed, city added)
  const totalSteps = 13;

  useEffect(() => {
    fetchPositions();
  }, []);

  // Load name from user metadata — handles email sign-up and all OAuth providers.
  useEffect(() => {
    const loadNames = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      const m = authUser.user_metadata ?? {};

      // Try dedicated first/last fields first (email sign-up, some providers).
      // Google OIDC also exposes given_name / family_name directly.
      let fn: string = m.first_name || m.given_name || "";
      let ln: string = m.last_name || m.family_name || "";

      // Fall back to splitting a combined full_name / name field.
      if (!fn || !ln) {
        const full: string = m.full_name || m.name || "";
        if (full.trim()) {
          const parts = full.trim().split(/\s+/);
          if (!fn) fn = parts[0] ?? "";
          if (!ln) ln = parts.slice(1).join(" ") || "";
        }
      }

      setFirstName(fn);
      setLastName(ln);
      // Only consider names auto-filled when both parts are non-empty.
      setNamesAutoFilled(!!(fn.trim() && ln.trim()));
    };

    void loadNames();
  }, []);

  // Initialize selected date if birthday is already set
  useEffect(() => {
    if (answers.birthday && !selectedDate) {
      setSelectedDate(new Date(answers.birthday));
    }
  }, [answers.birthday, selectedDate]);

  const fetchPositions = async () => {
    try {
      const { data, error } = await supabase
        .from("positions")
        .select("*")
        .order("name");

      if (error) throw error;
      setPositions(data || []);
    } catch (error) {
      console.error("Error fetching positions:", error);
      toast({
        title: t("toast.errorTitle"),
        description: t("toast.loadPositionsFailed"),
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t("toast.errorTitle"),
          description: t("toast.imageTooLarge"),
          variant: "destructive",
          duration: 2000,
        });
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast({
          title: t("toast.errorTitle"),
          description: t("toast.invalidImage"),
          variant: "destructive",
          duration: 2000,
        });
        return;
      }

      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    const input = document.getElementById("image-upload") as HTMLInputElement;
    if (input) input.value = "";
  };

  const handleSecondaryPositionChange = (
    positionId: string,
    checked: boolean
  ) => {
    if (checked) {
      setAnswers((prev) => ({
        ...prev,
        secondaryPositions: [...prev.secondaryPositions, positionId],
      }));
    } else {
      setAnswers((prev) => ({
        ...prev,
        secondaryPositions: prev.secondaryPositions.filter(
          (id) => id !== positionId
        ),
      }));
    }
  };

  // Validation for each step
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        // If names were auto-filled from metadata, always valid.
        // Otherwise require the user to fill them in.
        return namesAutoFilled || (firstName.trim() !== "" && lastName.trim() !== "");
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
        return true; // Height is optional
      case 10:
        return cityLocation !== null; // City is required
      case 11:
        return true; // Gender has default
      case 12:
        return true; // Photo is optional
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps - 1 && isStepValid(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Final validation
    const requiredFields = [
      answers.primaryPosition,
      answers.generalSkillLevel,
      answers.trainingStatus,
      answers.competitionLevel,
      answers.gamePerformance,
      answers.matchExperience,
      answers.height,
    ];

    if (
      requiredFields.some(
        (field) => !field || answers.secondaryPositions.length === 0
      ) ||
      !cityLocation
    ) {
      toast({
        title: t("toast.errorTitle"),
        description: t("toast.answerAllRequired"),
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    const fn = firstName.trim();
    const ln = lastName.trim();

    if (!fn || !ln) {
      toast({
        title: t("toast.errorTitle"),
        description: t("toast.enterName"),
        variant: "destructive",
        duration: 2000,
      });
      setCurrentStep(0);
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: existingPlayer } = await supabase
        .from("players")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existingPlayer) {
        toast({
          title: "Success",
          description: t("toast.profileExists"),
          duration: 1500,
        });
        navigate("/home", { replace: true });
        return;
      }

      let imageUrl = null;
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("player-images")
          .upload(fileName, imageFile);

        if (uploadError) {
          console.warn("Image upload error:", uploadError.message);
          toast({
            title: "Notice",
            description: t("toast.imageUploadFailed"),
            variant: "default",
            duration: 2000,
          });
        } else {
          const {
            data: { publicUrl },
          } = supabase.storage.from("player-images").getPublicUrl(fileName);

          imageUrl = publicUrl;
        }
      }

      const calculatedSkillLevel = calculateSkillLevel(answers);

      const { data: newPlayer, error: playerError } = await supabase
        .from("players")
        .insert({
          user_id: user.id,
          first_name: fn,
          last_name: ln,
          skill_rating: calculatedSkillLevel,
          rating_history: [{ date: new Date().toISOString(), rating: calculatedSkillLevel, type: "onboarding" }],
          general_skill_level: answers.generalSkillLevel,
          training_status: answers.trainingStatus,
          competition_level: answers.competitionLevel,
          game_performance: answers.gamePerformance,
          match_experience: answers.matchExperience,
          gender: answers.gender,
          birthday: answers.birthday || null,
          height_cm: answers.height || null,
          city: cityLocation?.city || null,
          country: cityLocation?.country || null,
          country_code: cityLocation?.countryCode || null,
          image_url: imageUrl,
          profile_completed: true,
        })
        .select()
        .single();

      if (playerError) {
        console.error("🚨 Player creation error:", playerError);
        throw playerError;
      }

      const positionInserts = [];
      positionInserts.push({
        player_id: newPlayer.id,
        position_id: answers.primaryPosition,
        is_primary: true,
      });

      answers.secondaryPositions.forEach((positionId) => {
        positionInserts.push({
          player_id: newPlayer.id,
          position_id: positionId,
          is_primary: false,
        });
      });

      if (positionInserts.length > 0) {
        const { error: positionsError } = await supabase
          .from("player_positions")
          .insert(positionInserts);

        if (positionsError) {
          console.error("🚨 Error creating player positions:", positionsError);
          toast({
            title: "Warning",
            description: t("toast.positionsFailed"),
            variant: "destructive",
            duration: 2000,
          });
        }
      }

      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }

      toast({
        title: "Success",
        description: t("toast.profileCreated", { level: calculatedSkillLevel }),
        duration: 1500,
      });

      // If a pending invite token exists, redirect to the invite page
      const pendingToken = localStorage.getItem("pendingInviteToken");
      if (pendingToken) {
        navigate(`/invite/${encodeURIComponent(pendingToken)}`, { replace: true });
      } else {
        navigate("/home", { replace: true });
      }
    } catch (error) {
      console.error("🚨 Error creating player:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: t("toast.errorTitle"),
        description: t("toast.createFailed", { error: errorMessage }),
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step content renderer
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-8 text-center max-w-2xl mx-auto">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-foreground">
                🏐 {t("welcome.title")}
              </h1>
              <p className="text-xl text-muted-foreground">
                {t("welcome.subtitle")}
              </p>
            </div>

            {/* Show name fields when they couldn't be read from OAuth/email metadata */}
            {!namesAutoFilled && (
              <div className="text-left space-y-3 bg-muted/50 rounded-lg p-4">
                <p className="text-sm font-medium text-foreground">
                  {t("welcome.namePrompt")}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="ob-first-name">{t("welcome.firstName")}</Label>
                    <Input
                      id="ob-first-name"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder={t("welcome.firstNamePlaceholder")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ob-last-name">{t("welcome.lastName")}</Label>
                    <Input
                      id="ob-last-name"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder={t("welcome.lastNamePlaceholder")}
                    />
                  </div>
                </div>
              </div>
            )}

            <p className="text-muted-foreground">
              {t("welcome.duration")}
            </p>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-2xl font-bold text-foreground">
                  {t("primaryPosition.title")}
                </h2>

                {/* Inline help icon */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Show positions help"
                      onClick={() => setIsPositionsHelpOpen(true)}
                      className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                      style={{ aspectRatio: "1 / 1", flex: "0 0 auto" }}
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{t("positionsHelp.showDiagram")}</TooltipContent>
                </Tooltip>
              </div>
              <p className="text-muted-foreground">
                {t("primaryPosition.subtitle")}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {positions.map((position) => (
                <label
                  key={position.id}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    answers.primaryPosition === position.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground bg-card"
                  }`}
                >
                  <input
                    type="radio"
                    name="primaryPosition"
                    value={position.id}
                    checked={answers.primaryPosition === position.id}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        primaryPosition: e.target.value,
                      }))
                    }
                    className="mr-3"
                  />
                  <span className="font-medium text-foreground">
                    {position.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-2xl font-bold text-foreground">
                  {t("secondaryPosition.title")}
                </h2>

                {/* Inline help icon */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Show positions help"
                      onClick={() => setIsPositionsHelpOpen(true)}
                      className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                      style={{ aspectRatio: "1 / 1", flex: "0 0 auto" }}
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{t("positionsHelp.showDiagram")}</TooltipContent>
                </Tooltip>
              </div>

              <p className="text-muted-foreground">
                {t("secondaryPosition.subtitle")}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {positions
                .filter((pos) => pos.id !== answers.primaryPosition)
                .map((position) => (
                  <label
                    key={position.id}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      answers.secondaryPositions.includes(position.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground bg-card"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={answers.secondaryPositions.includes(position.id)}
                      onChange={(e) =>
                        handleSecondaryPositionChange(
                          position.id,
                          e.target.checked
                        )
                      }
                      className="mr-3"
                    />
                    <span className="font-medium text-foreground">
                      {position.name}
                    </span>
                  </label>
                ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-foreground">
                {t("skillLevel.title")}
              </h2>
              <p className="text-muted-foreground">
                {t("skillLevel.subtitle")}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 max-w-lg mx-auto">
              {[
                { value: "just-starting", label: t("skillLevel.justStarting") },
                { value: "intermediate", label: t("skillLevel.intermediate") },
                { value: "advanced", label: t("skillLevel.advanced") },
                { value: "competitive", label: t("skillLevel.competitive") },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    answers.generalSkillLevel === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground bg-card"
                  }`}
                >
                  <input
                    type="radio"
                    name="generalSkillLevel"
                    value={option.value}
                    checked={answers.generalSkillLevel === option.value}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        generalSkillLevel: e.target.value as SkillLevelType,
                      }))
                    }
                    className="mr-3"
                  />
                  <span className="font-medium text-foreground">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-foreground">
                {t("training.title")}
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 max-w-lg mx-auto">
              {[
                { value: "no", label: t("training.no") },
                { value: "used-to", label: t("training.usedTo") },
                {
                  value: "currently",
                  label: t("training.currently"),
                },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    answers.trainingStatus === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground bg-card"
                  }`}
                >
                  <input
                    type="radio"
                    name="trainingStatus"
                    value={option.value}
                    checked={answers.trainingStatus === option.value}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        trainingStatus: e.target.value as TrainingStatusType,
                      }))
                    }
                    className="mr-3"
                  />
                  <span className="font-medium text-foreground">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-foreground">
                {t("competition.title")}
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 max-w-lg mx-auto">
              {[
                { value: "casual", label: t("competition.casual") },
                { value: "friendly", label: t("competition.friendly") },
                { value: "amateur", label: t("competition.amateur") },
                {
                  value: "federated",
                  label: t("competition.federated"),
                },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    answers.competitionLevel === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground bg-card"
                  }`}
                >
                  <input
                    type="radio"
                    name="competitionLevel"
                    value={option.value}
                    checked={answers.competitionLevel === option.value}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        competitionLevel: e.target
                          .value as CompetitionLevelType,
                      }))
                    }
                    className="mr-3"
                  />
                  <span className="font-medium text-foreground">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-foreground">
                {t("performance.title")}
              </h2>
              <p className="text-muted-foreground">
                {t("performance.subtitle")}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
              {[
                { value: "basic-contact", label: t("performance.basicContact") },
                { value: "consistent-play", label: t("performance.consistentPlay") },
                { value: "tactical-aware", label: t("performance.tacticalAware") },
                { value: "advanced-skills", label: t("performance.advancedSkills") },
                { value: "competitive-level", label: t("performance.competitiveLevel") },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    answers.gamePerformance === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground bg-card"
                  }`}
                >
                  <input
                    type="radio"
                    name="gamePerformance"
                    value={option.value}
                    checked={answers.gamePerformance === option.value}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        gamePerformance: e.target.value as GamePerformanceType,
                      }))
                    }
                    className="mr-3"
                  />
                  <span className="font-medium text-foreground">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-foreground">
                {t("matchExperience.title")}
              </h2>
              <p className="text-muted-foreground">
                {t("matchExperience.subtitle")}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 max-w-lg mx-auto">
              {[
                { value: "none", label: t("matchExperience.none") },
                { value: "few", label: t("matchExperience.few") },
                { value: "some", label: t("matchExperience.some") },
                { value: "many", label: t("matchExperience.many") },
                { value: "extensive", label: t("matchExperience.extensive") },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    answers.matchExperience === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground bg-card"
                  }`}
                >
                  <input
                    type="radio"
                    name="matchExperience"
                    value={option.value}
                    checked={answers.matchExperience === option.value}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        matchExperience: e.target.value as MatchExperienceType,
                      }))
                    }
                    className="mr-3"
                  />
                  <span className="font-medium text-foreground">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-foreground">
                {t("height.title")}
              </h2>
              <p className="text-muted-foreground">
                {t("height.subtitle")}
              </p>
            </div>
            <div className="max-w-xs mx-auto">
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  min="110"
                  max="220"
                  placeholder="175"
                  value={answers.height || ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      height: parseInt(e.target.value) || undefined,
                    }))
                  }
                  className="text-center"
                />
                <span className="text-sm text-muted-foreground">
                  {t("height.unit")}
                </span>
              </div>
            </div>
          </div>
        );

      case 9: {
        const today = new Date();
        const tenYearsAgo = new Date();
        tenYearsAgo.setFullYear(today.getFullYear() - 10);
        const maxDate = tenYearsAgo.toISOString().split("T")[0];

        return (
          <div className="space-y-6 w-full">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-foreground">
                {t("birthday.title")}
              </h2>
            </div>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <Input
                type="date"
                value={answers.birthday}
                max={maxDate}
                onChange={(e) => {
                  setAnswers((prev) => ({
                    ...prev,
                    birthday: e.target.value,
                  }));
                  if (e.target.value) {
                    setSelectedDate(new Date(e.target.value));
                  }
                }}
                className="w-full min-w-0 text-left dark:bg-card dark:border-border dark:text-foreground dark:[color-scheme:dark] pl-10"
                placeholder="YYYY-MM-DD"
              />
            </div>
          </div>
        );
      }

      case 10:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-foreground">
                {t("city.title")}
              </h2>
              <p className="text-muted-foreground">
                {t("city.subtitle")}
              </p>
            </div>
            <div className="max-w-sm mx-auto">
              <CityLocationSelector
                label={t("city.label")}
                placeholder={t("city.placeholder")}
                value={cityLocation}
                onChange={setCityLocation}
              />
              {cityLocation && (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {cityLocation.city}, {cityLocation.country}
                </p>
              )}
            </div>
          </div>
        );

      case 11:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-foreground">
                {t("gender.title")}
              </h2>
              <p className="text-muted-foreground">
                {t("gender.subtitle")}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 max-w-sm mx-auto">
              {[
                { value: "male", label: t("gender.male") },
                { value: "female", label: t("gender.female") },
                { value: "diverse", label: t("gender.diverse") },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    answers.gender === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground bg-card"
                  }`}
                >
                  <input
                    type="radio"
                    name="gender"
                    value={option.value}
                    checked={answers.gender === option.value}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        gender: e.target.value as GenderType,
                      }))
                    }
                    className="mr-3"
                  />
                  <span className="font-medium text-foreground">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );

      case 12:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-foreground">
                {t("photo.title")}
              </h2>
              <p className="text-muted-foreground">
                {t("photo.subtitle")}
              </p>
            </div>
            <div className="flex flex-col items-center space-y-6">
              <Avatar className="h-32 w-32">
                <AvatarImage
                  src={imagePreview || ""}
                  alt="Profile preview"
                  className="object-cover"
                />
                <AvatarFallback className="text-2xl bg-muted">
                  📷
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col space-y-3">
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <div className="flex items-center justify-center space-x-2 px-6 py-3 border-2 border-dashed border-border rounded-lg hover:border-muted-foreground transition-colors bg-card">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium text-foreground">
                      {imageFile ? t("photo.change") : t("photo.upload")}
                    </span>
                  </div>
                </Label>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />

                {imageFile && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={removeImage}
                    className="flex items-center space-x-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    icon={<X className="h-4 w-4" />}
                  >
                    {t("photo.remove")}
                  </Button>
                )}
              </div>

              {imageFile && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  {t("photo.selected", { name: imageFile.name })}
                </p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fixed progress bar */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-background px-4 pt-4 pb-2">
        <Progress
          value={((currentStep + 1) / totalSteps) * 100}
          className="h-1.5"
        />
      </div>
      <div className="h-10" />

      {/* Scrollable content — vertically centered */}
      <div className="flex-1 overflow-y-auto pb-28 flex items-center">
        <div className="max-w-lg mx-auto px-4 py-6 w-full">
          {renderStepContent()}
        </div>
      </div>

      {/* Fixed bottom nav buttons */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-lg mx-auto flex justify-between items-center">
          {/* Previous Button */}
          <Button
            type="button"
            variant="action"
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`flex items-center space-x-2 ${
              currentStep === 0 ? "invisible" : ""
            }`}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            {t("nav.previous")}
          </Button>

          {/* Next/Submit Button */}
          {currentStep < totalSteps - 1 ? (
            <Button
              type="button"
              variant="primary"
              onClick={nextStep}
              disabled={!isStepValid(currentStep)}
              className="flex items-center space-x-2"
              icon={<ChevronRight className="h-4 w-4" />}
            >
              {t("nav.next")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting || !isStepValid(currentStep)}
              className="flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                  <span>{t("nav.creatingProfile")}</span>
                </>
              ) : (
                <>
                  <span>{t("nav.completeProfile")}</span>
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Positions Help Drawer (mobile) / Sheet (desktop) */}
      <TooltipProvider>
        {(() => {
          const positionsContent = (
            <div className="px-4 pb-2">
              <div className="mx-auto w-full md:max-w-3xl">
                <img
                  src="/positions-volleyball-players-en.png"
                  alt={t("positionsHelp.diagramAlt")}
                  className="w-full h-auto max-h-[70vh] md:max-h-[80vh] object-contain rounded-md border"
                />
                <p className="mt-3 text-center text-sm text-muted-foreground">
                  {t("positionsHelp.diagramCaption")}
                </p>
              </div>
            </div>
          );

          return isCompact ? (
            <Drawer
              open={isPositionsHelpOpen}
              onOpenChange={setIsPositionsHelpOpen}
              shouldScaleBackground
            >
              <DrawerContent className="pb-6">
                <DrawerClose
                  className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full
                    border border-border bg-card/90 shadow hover:bg-card focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </DrawerClose>
                <DrawerHeader className="pt-8">
                  <DrawerTitle>{t("positionsHelp.title")}</DrawerTitle>
                  <DrawerDescription>
                    {t("positionsHelp.description")}
                  </DrawerDescription>
                </DrawerHeader>
                {positionsContent}
              </DrawerContent>
            </Drawer>
          ) : (
            <Sheet open={isPositionsHelpOpen} onOpenChange={setIsPositionsHelpOpen}>
              <SheetContent side="right" className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>{t("positionsHelp.title")}</SheetTitle>
                  <SheetDescription>
                    {t("positionsHelp.description")}
                  </SheetDescription>
                </SheetHeader>
                {positionsContent}
              </SheetContent>
            </Sheet>
          );
        })()}
      </TooltipProvider>
    </div>
  );
};

export default PlayerOnboarding;
