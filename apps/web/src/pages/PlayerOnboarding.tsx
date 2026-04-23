import { useState, useEffect } from "react";
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
const calculateSkillLevel = (answers: OnboardingAnswers): number => {
  let totalScore = 0;

  const skillScores: Record<SkillLevelType, number> = {
    "just-starting": 5,
    intermediate: 15,
    advanced: 25,
    competitive: 30,
  };
  totalScore += skillScores[answers.generalSkillLevel as SkillLevelType] || 5;

  const performanceScores: Record<GamePerformanceType, number> = {
    "basic-contact": 5,
    "consistent-play": 10,
    "tactical-aware": 15,
    "advanced-skills": 20,
    "competitive-level": 25,
  };
  totalScore +=
    performanceScores[answers.gamePerformance as GamePerformanceType] || 5;

  const competitionScores: Record<CompetitionLevelType, number> = {
    casual: 5,
    friendly: 10,
    amateur: 15,
    federated: 20,
  };
  totalScore +=
    competitionScores[answers.competitionLevel as CompetitionLevelType] || 5;

  const trainingScores: Record<TrainingStatusType, number> = {
    no: 3,
    "used-to": 8,
    currently: 15,
  };
  totalScore +=
    trainingScores[answers.trainingStatus as TrainingStatusType] || 3;

  const experienceScores: Record<MatchExperienceType, number> = {
    none: 2,
    few: 4,
    some: 6,
    many: 8,
    extensive: 10,
  };
  totalScore +=
    experienceScores[answers.matchExperience as MatchExperienceType] || 2;

  const finalRating = Math.max(15, Math.min(100, totalScore));
  return finalRating;
};

const PlayerOnboarding = () => {
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
        title: "Error",
        description: "Failed to load positions",
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
          title: "Error",
          description: "Image size must be less than 5MB",
          variant: "destructive",
          duration: 2000,
        });
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast({
          title: "Error",
          description: "Please select a valid image file",
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
        title: "Error",
        description: "Please answer all required questions",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    const fn = firstName.trim();
    const ln = lastName.trim();

    if (!fn || !ln) {
      toast({
        title: "Error",
        description: "Please enter your first and last name to continue.",
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
          description: "Player profile already exists!",
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
            description:
              "Image upload failed, but profile will be created without photo.",
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
            description: "Player created but positions failed to save",
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
        description: `Player profile created! Skill level: ${calculatedSkillLevel}/100`,
        duration: 1500,
      });

      // Auto-join club if a pending invite exists from /join/:slug link
      const pendingSlug = localStorage.getItem("pendingClubJoinSlug");
      if (pendingSlug) {
        try {
          const { error: joinErr } = await supabase.rpc("request_join_by_slug", {
            p_slug: pendingSlug.trim().toLowerCase(),
            p_member_association: false,
          });
          if (!joinErr) {
            toast({
              title: "Join request sent!",
              description: "Your request was sent to the club admins.",
              duration: 2000,
            });
          }
        } catch {
          // Silently ignore — user can join manually later
        }
        localStorage.removeItem("pendingClubJoinSlug");
      }

      navigate("/home", { replace: true });
    } catch (error) {
      console.error("🚨 Error creating player:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Error",
        description: `Failed to create player profile: ${errorMessage}`,
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
                🏐 Let's Complete Your Player Profile
              </h1>
              <p className="text-xl text-muted-foreground">
                Help us get to know your volleyball style so we can match you
                with the right team!
              </p>
            </div>

            {/* Show name fields when they couldn't be read from OAuth/email metadata */}
            {!namesAutoFilled && (
              <div className="text-left space-y-3 bg-muted/50 rounded-lg p-4">
                <p className="text-sm font-medium text-foreground">
                  First, tell us your name:
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="ob-first-name">First name</Label>
                    <Input
                      id="ob-first-name"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jane"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ob-last-name">Last name</Label>
                    <Input
                      id="ob-last-name"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                    />
                  </div>
                </div>
              </div>
            )}

            <p className="text-muted-foreground">
              This will take about 2-4 minutes to complete.
            </p>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-2xl font-bold text-foreground">
                  What's your main position on the court?
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
                  <TooltipContent>Show positions diagram</TooltipContent>
                </Tooltip>
              </div>
              <p className="text-muted-foreground">
                This is the position you feel most comfortable playing.
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
                  What other positions can you play? *
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
                  <TooltipContent>Show positions diagram</TooltipContent>
                </Tooltip>
              </div>

              <p className="text-muted-foreground">
                Select at least one other position that you're comfortable
                playing
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
                How would you rate your current skill level?
              </h2>
              <p className="text-muted-foreground">
                This helps us understand your general playing experience.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 max-w-lg mx-auto">
              {[
                { value: "just-starting", label: "Just starting out" },
                { value: "intermediate", label: "Intermediate" },
                { value: "advanced", label: "Advanced" },
                { value: "competitive", label: "Competitive / Professional" },
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
                Are you receiving regular volleyball training?
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 max-w-lg mx-auto">
              {[
                { value: "no", label: "No" },
                { value: "used-to", label: "I used to train, but not anymore" },
                {
                  value: "currently",
                  label: "Yes, I currently train regularly",
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
                At what level do you usually compete?
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 max-w-lg mx-auto">
              {[
                { value: "casual", label: "Just casual games with friends" },
                { value: "friendly", label: "Friendly or local tournaments" },
                { value: "amateur", label: "Amateur league matches" },
                {
                  value: "federated",
                  label: "Federated or official competitions",
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
                How would you describe your performance during games?
              </h2>
              <p className="text-muted-foreground">
                Pick the option that best reflects your typical performance
                level.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
              {[
                {
                  value: "basic-contact",
                  label:
                    "I can make basic contact with the ball and serve underhand",
                },
                {
                  value: "consistent-play",
                  label:
                    "I can serve overhand and play consistently without major errors",
                },
                {
                  value: "tactical-aware",
                  label:
                    "I understand positioning and can execute basic tactics",
                },
                {
                  value: "advanced-skills",
                  label: "I can spike, block, and set with good technique",
                },
                {
                  value: "competitive-level",
                  label:
                    "I play at a competitive level with advanced skills and game awareness",
                },
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
                How many volleyball matches have you played?
              </h2>
              <p className="text-muted-foreground">
                Include both competitive and casual matches.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 max-w-lg mx-auto">
              {[
                {
                  value: "none",
                  label: "None or just a few practice sessions",
                },
                { value: "few", label: "1-10 matches" },
                { value: "some", label: "11-50 matches" },
                { value: "many", label: "51-200 matches" },
                { value: "extensive", label: "200+ matches" },
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
                What's your height?
              </h2>
              <p className="text-muted-foreground">
                This helps us create balanced teams for blocking and attacking.
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
                  cm
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
                When's your birthday?
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
                Which city are you based in?
              </h2>
              <p className="text-muted-foreground">
                This helps us connect you with local players and clubs.
              </p>
            </div>
            <div className="max-w-sm mx-auto">
              <CityLocationSelector
                label="City"
                placeholder="Start typing your city..."
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
                What's your gender?
              </h2>
              <p className="text-muted-foreground">
                This helps us create balanced teams.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 max-w-sm mx-auto">
              {[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "diverse", label: "Diverse" },
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
                Upload a profile picture
              </h2>
              <p className="text-muted-foreground">
                Add a photo so your teammates can recognize you!
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
                      {imageFile ? "Change Photo" : "Upload Photo"}
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
                    Remove
                  </Button>
                )}
              </div>

              {imageFile && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  ✓ {imageFile.name} selected
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
            Previous
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
              Next
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
                  <span>Creating Profile...</span>
                </>
              ) : (
                <>
                  <span>Complete Profile</span>
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
                  alt="Volleyball player positions on court"
                  className="w-full h-auto max-h-[70vh] md:max-h-[80vh] object-contain rounded-md border"
                />
                <p className="mt-3 text-center text-sm text-muted-foreground">
                  Use this diagram to confirm your primary and secondary
                  roles.
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
                  <DrawerTitle>Volleyball court positions</DrawerTitle>
                  <DrawerDescription>
                    Reference diagram to pick your positions.
                  </DrawerDescription>
                </DrawerHeader>
                {positionsContent}
              </DrawerContent>
            </Drawer>
          ) : (
            <Sheet open={isPositionsHelpOpen} onOpenChange={setIsPositionsHelpOpen}>
              <SheetContent side="right" className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Volleyball court positions</SheetTitle>
                  <SheetDescription>
                    Reference diagram to pick your positions.
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
