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
} from "lucide-react";
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

  const [positions, setPositions] = useState<Position[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isPositionsHelpOpen, setIsPositionsHelpOpen] =
    useState<boolean>(false);

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

  // Total number of steps (association membership removed)
  const totalSteps = 12;

  useEffect(() => {
    fetchPositions();
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
        });
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast({
          title: "Error",
          description: "Please select a valid image file",
          variant: "destructive",
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
        return true; // Welcome screen - always valid
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
        return true; // Gender has default
      case 11:
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
      )
    ) {
      toast({
        title: "Error",
        description: "Please answer all required questions",
        variant: "destructive",
      });
      return;
    }

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    const firstName = authUser?.user_metadata?.first_name || "";
    const lastName = authUser?.user_metadata?.last_name || "";

    if (!firstName || !lastName) {
      toast({
        title: "Error",
        description: "First and last names are required from your account.",
        variant: "destructive",
      });
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
        navigate("/start", { replace: true });
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
          first_name: firstName,
          last_name: lastName,
          skill_rating: calculatedSkillLevel,
          general_skill_level: answers.generalSkillLevel,
          training_status: answers.trainingStatus,
          competition_level: answers.competitionLevel,
          game_performance: answers.gamePerformance,
          match_experience: answers.matchExperience,
          gender: answers.gender,
          birthday: answers.birthday || null,
          height_cm: answers.height || null,
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

      navigate("/start", { replace: true });
    } catch (error) {
      console.error("🚨 Error creating player:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Error",
        description: `Failed to create player profile: ${errorMessage}`,
        variant: "destructive",
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
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                🏐 Let's Complete Your Player Profile
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Help us get to know your volleyball style so we can match you
                with the right team!
              </p>
            </div>

            <p className="text-gray-500 dark:text-gray-400">
              This will take about 2-4 minutes to complete.
            </p>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  What's your main position on the court?
                </h2>

                {/* Inline help icon */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Show positions help"
                      onClick={() => setIsPositionsHelpOpen(true)}
                      className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ring"
                      style={{ aspectRatio: "1 / 1", flex: "0 0 auto" }}
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Show positions diagram</TooltipContent>
                </Tooltip>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                This is the position you feel most comfortable playing.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {positions.map((position) => (
                <label
                  key={position.id}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    answers.primaryPosition === position.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
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
                  <span className="font-medium text-gray-900 dark:text-gray-100">
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
            <div className="text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  What other positions can you play? *
                </h2>

                {/* Inline help icon */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Show positions help"
                      onClick={() => setIsPositionsHelpOpen(true)}
                      className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ring"
                      style={{ aspectRatio: "1 / 1", flex: "0 0 auto" }}
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Show positions diagram</TooltipContent>
                </Tooltip>
              </div>

              <p className="text-gray-600 dark:text-gray-400">
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
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
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
                    <span className="font-medium text-gray-900 dark:text-gray-100">
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
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                How would you rate your current skill level?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
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
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
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
                  <span className="font-medium text-gray-900 dark:text-gray-100">
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
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
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
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
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
                  <span className="font-medium text-gray-900 dark:text-gray-100">
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
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
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
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
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
                  <span className="font-medium text-gray-900 dark:text-gray-100">
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
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                How would you describe your performance during games?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
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
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
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
                  <span className="font-medium text-gray-900 dark:text-gray-100">
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
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                How many volleyball matches have you played?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
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
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
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
                  <span className="font-medium text-gray-900 dark:text-gray-100">
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
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                What's your height?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
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
                <span className="text-sm text-gray-600 dark:text-gray-400">
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
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                When's your birthday?
              </h2>
            </div>
            <div className="w-full sm:max-w-xs space-y-3">
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
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
                  className="w-full text-left dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:[color-scheme:dark] pl-10 [&::-webkit-calendar-picker-indicator]:opacity-0"
                  placeholder="YYYY-MM-DD"
                />
              </div>
            </div>
          </div>
        );
      }

      case 10:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                What's your gender?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
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
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
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
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );

      case 11:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                Upload a profile picture
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
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
                <AvatarFallback className="text-2xl bg-gray-200 dark:bg-gray-700">
                  📷
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col space-y-3">
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <div className="flex items-center justify-center space-x-2 px-6 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors bg-white dark:bg-gray-800">
                    <Upload className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
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
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 md:p-8
             min-h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)]
             flex flex-col"
        >
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Step {currentStep + 1} of {totalSteps}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {Math.round(((currentStep + 1) / totalSteps) * 100)}% Complete
              </span>
            </div>
            <Progress
              value={((currentStep + 1) / totalSteps) * 100}
              className="h-2"
            />
          </div>

          {/* Step Content */}
          <div className="flex-grow flex items-center justify-center py-4 overflow-y-auto">
            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
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
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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

          {/* Positions Help Drawer (used by steps 1 & 2) */}
          <TooltipProvider>
            <Drawer
              open={isPositionsHelpOpen}
              onOpenChange={setIsPositionsHelpOpen}
              shouldScaleBackground
            >
              {/* We trigger it programmatically from the icon; no visible trigger here */}
              <DrawerContent className="pb-6">
                {/* Close X (top-right) */}
                <DrawerClose
                  className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full
                   border bg-white/90 shadow hover:bg-white focus:outline-none focus:ring-2 focus:ring-ring"
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

                {/* Content: responsive image container */}
                <div className="px-4 pb-2">
                  <div
                    className="
            mx-auto w-full
            md:max-w-3xl
          "
                  >
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
              </DrawerContent>
            </Drawer>
          </TooltipProvider>

          {/* Step Indicators (Optional) */}
          <div className="flex justify-center mt-6 space-x-2">
            {Array.from({ length: totalSteps }, (_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full ${
                  index <= currentStep
                    ? "bg-blue-500 dark:bg-blue-400"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerOnboarding;
