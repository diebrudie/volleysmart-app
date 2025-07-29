import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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
  | "stay-back"
  | "struggle-net"
  | "not-confident"
  | "some-confidence"
  | "fully-confident";

interface OnboardingAnswers {
  primaryPosition: string;
  secondaryPositions: string[];
  generalSkillLevel: SkillLevelType | "";
  trainingStatus: TrainingStatusType | "";
  competitionLevel: CompetitionLevelType | "";
  gamePerformance: GamePerformanceType | "";
  birthday: string;
  gender: GenderType;
  memberAssociation: boolean;
}

// Strongly typed skill calculation function
const calculateSkillLevel = (answers: OnboardingAnswers): number => {
  let totalScore = 0;

  const skillScores: Record<SkillLevelType, number> = {
    "just-starting": 8,
    intermediate: 20,
    advanced: 32,
    competitive: 40,
  };
  totalScore += skillScores[answers.generalSkillLevel as SkillLevelType] || 8;

  const performanceScores: Record<GamePerformanceType, number> = {
    "stay-back": 6,
    "struggle-net": 12,
    "not-confident": 18,
    "some-confidence": 24,
    "fully-confident": 30,
  };
  totalScore +=
    performanceScores[answers.gamePerformance as GamePerformanceType] || 6;

  const competitionScores: Record<CompetitionLevelType, number> = {
    casual: 5,
    friendly: 10,
    amateur: 15,
    federated: 20,
  };
  totalScore +=
    competitionScores[answers.competitionLevel as CompetitionLevelType] || 5;

  const trainingScores: Record<TrainingStatusType, number> = {
    no: 2,
    "used-to": 5,
    currently: 10,
  };
  totalScore +=
    trainingScores[answers.trainingStatus as TrainingStatusType] || 2;

  return Math.round((totalScore / 100) * 4) + 1;
};

const PlayerOnboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [positions, setPositions] = useState<Position[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [answers, setAnswers] = useState<OnboardingAnswers>({
    primaryPosition: "",
    secondaryPositions: [],
    generalSkillLevel: "",
    trainingStatus: "",
    competitionLevel: "",
    gamePerformance: "",
    birthday: "2000-01-01",
    gender: "other",
    memberAssociation: false,
  });

  useEffect(() => {
    fetchPositions();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate required fields
    if (
      !answers.primaryPosition ||
      !answers.generalSkillLevel ||
      !answers.trainingStatus ||
      !answers.competitionLevel ||
      !answers.gamePerformance
    ) {
      toast({
        title: "Error",
        description: "Please answer all required questions",
        variant: "destructive",
      });
      return;
    }

    console.log("🔍 Starting player creation for user:", user.id);

    // Get user metadata for first and last names
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
      // Check if player already exists
      const { data: existingPlayer } = await supabase
        .from("players")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existingPlayer) {
        console.log("🔍 Player already exists, redirecting to /start");
        toast({
          title: "Success",
          description: "Player profile already exists!",
        });
        navigate("/start", { replace: true });
        return;
      }

      // Calculate skill level based on answers
      const calculatedSkillLevel = calculateSkillLevel(answers);
      console.log(
        "🎯 Calculated skill level:",
        calculatedSkillLevel,
        "from answers:",
        answers
      );

      // Create player with assessment data
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
          member_association: answers.memberAssociation,
          gender: answers.gender,
          birthday: answers.birthday || null,
          profile_completed: true,
        })
        .select()
        .single();

      if (playerError) {
        console.error("🚨 Player creation error:", playerError);
        throw playerError;
      }

      console.log("✅ Player created successfully:", newPlayer);

      // Now create position relationships in player_positions table
      const positionInserts = [];

      // Add primary position
      positionInserts.push({
        player_id: newPlayer.id,
        position_id: answers.primaryPosition,
        is_primary: true,
      });

      // Add secondary positions
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
        } else {
          console.log("✅ Player positions created successfully");
        }
      }

      toast({
        title: "Success",
        description: `Player profile created! Skill level: ${calculatedSkillLevel}/5`,
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              🏐 Let's Complete Your Player Profile
            </h1>
            <p className="text-gray-600">
              Help us get to know your volleyball style so we can match you with
              the right team!
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Q1: Primary Position */}
            <div>
              <Label className="text-lg font-medium">
                1. What's your main position on the court? *
              </Label>
              <p className="text-sm text-gray-500 mb-3">
                This is the position you feel most comfortable playing.
              </p>
              <Select
                value={answers.primaryPosition}
                onValueChange={(value) =>
                  setAnswers((prev) => ({ ...prev, primaryPosition: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your main position" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((position) => (
                    <SelectItem key={position.id} value={position.id}>
                      {position.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Q2: Secondary Positions */}
            <div>
              <Label className="text-lg font-medium">
                2. What other positions can you play?
              </Label>
              <p className="text-sm text-gray-500 mb-3">
                Select any other positions you're comfortable with. Your main
                position is not listed here.
              </p>
              <div className="mt-3 space-y-3">
                {positions
                  .filter((pos) => pos.id !== answers.primaryPosition)
                  .map((position) => (
                    <div
                      key={position.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`secondary-${position.id}`}
                        checked={answers.secondaryPositions.includes(
                          position.id
                        )}
                        onCheckedChange={(checked) =>
                          handleSecondaryPositionChange(position.id, !!checked)
                        }
                      />
                      <Label htmlFor={`secondary-${position.id}`}>
                        {position.name}
                      </Label>
                    </div>
                  ))}
              </div>
            </div>

            {/* Q3: General Skill Level */}
            <div>
              <Label className="text-lg font-medium">
                3. How would you rate your current skill level? *
              </Label>
              <p className="text-sm text-gray-500 mb-3">
                This helps us understand your general playing experience.
              </p>
              <RadioGroup
                value={answers.generalSkillLevel}
                onValueChange={(value: SkillLevelType) =>
                  setAnswers((prev) => ({ ...prev, generalSkillLevel: value }))
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="just-starting" id="just-starting" />
                  <Label htmlFor="just-starting">Just starting out</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="intermediate" id="intermediate" />
                  <Label htmlFor="intermediate">Intermediate</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="advanced" id="advanced" />
                  <Label htmlFor="advanced">Advanced</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="competitive" id="competitive" />
                  <Label htmlFor="competitive">
                    Competitive / Professional
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Q4: Training Status */}
            <div>
              <Label className="text-lg font-medium">
                4. Are you receiving regular volleyball training? *
              </Label>
              <RadioGroup
                value={answers.trainingStatus}
                onValueChange={(value: TrainingStatusType) =>
                  setAnswers((prev) => ({ ...prev, trainingStatus: value }))
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="no-training" />
                  <Label htmlFor="no-training">No</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="used-to" id="used-to-training" />
                  <Label htmlFor="used-to-training">
                    I used to train, but not anymore
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="currently" id="currently-training" />
                  <Label htmlFor="currently-training">
                    Yes, I currently train regularly
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Q5: Competition Level */}
            <div>
              <Label className="text-lg font-medium">
                5. At what level do you usually compete? *
              </Label>
              <RadioGroup
                value={answers.competitionLevel}
                onValueChange={(value: CompetitionLevelType) =>
                  setAnswers((prev) => ({ ...prev, competitionLevel: value }))
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="casual" id="casual" />
                  <Label htmlFor="casual">Just casual games with friends</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="friendly" id="friendly" />
                  <Label htmlFor="friendly">
                    Friendly or local tournaments
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="amateur" id="amateur" />
                  <Label htmlFor="amateur">Amateur league matches</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="federated" id="federated" />
                  <Label htmlFor="federated">
                    Federated or official competitions
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Q6: Game Performance */}
            <div>
              <Label className="text-lg font-medium">
                6. How would you describe your performance during games? *
              </Label>
              <p className="text-sm text-gray-500 mb-3">
                Try to pick the option that best reflects your typical
                performance.
              </p>
              <RadioGroup
                value={answers.gamePerformance}
                onValueChange={(value: GamePerformanceType) =>
                  setAnswers((prev) => ({ ...prev, gamePerformance: value }))
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="stay-back" id="stay-back" />
                  <Label htmlFor="stay-back">
                    I mostly stay in the back and rarely go to the net
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="struggle-net" id="struggle-net" />
                  <Label htmlFor="struggle-net">
                    I struggle near the net and often make mistakes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="not-confident" id="not-confident" />
                  <Label htmlFor="not-confident">
                    I can serve, receive, and attack but not confidently
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="some-confidence"
                    id="some-confidence"
                  />
                  <Label htmlFor="some-confidence">
                    I have solid positioning and volley with some confidence
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="fully-confident"
                    id="fully-confident"
                  />
                  <Label htmlFor="fully-confident">
                    I volley, position, and play confidently throughout the
                    match
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Q7: Birthday */}
            <div>
              <Label className="text-lg font-medium">
                7. When's your birthday?
              </Label>
              <Input
                type="date"
                value={answers.birthday}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, birthday: e.target.value }))
                }
                className="max-w-xs"
              />
            </div>

            {/* Q8: Gender */}
            <div>
              <Label className="text-lg font-medium">
                8. What's your gender?
              </Label>
              <p className="text-sm text-gray-500 mb-3">
                This helps us create balanced teams.
              </p>
              <RadioGroup
                value={answers.gender}
                onValueChange={(value: GenderType) =>
                  setAnswers((prev) => ({ ...prev, gender: value }))
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male">Male</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female">Female</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="diverse" id="diverse" />
                  <Label htmlFor="diverse">Diverse</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Q9: Volleyball Association Membership */}
            <div>
              <Label className="text-lg font-medium">
                9. Volleyball Association Membership
              </Label>
              <div className="flex items-center space-x-2 mt-3">
                <Checkbox
                  id="memberAssociation"
                  checked={answers.memberAssociation}
                  onCheckedChange={(checked) =>
                    setAnswers((prev) => ({
                      ...prev,
                      memberAssociation: !!checked,
                    }))
                  }
                />
                <Label htmlFor="memberAssociation">
                  I am a member of the Volleyball Association
                </Label>
              </div>
            </div>

            {/* Q10: Upload Profile Picture (Last Question) */}
            <div>
              <Label className="text-lg font-medium">
                10. Upload a profile picture
              </Label>
              <p className="text-sm text-gray-500 mb-3">
                Add a photo so your teammates can recognize you! (Coming soon)
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500">
                🖼️ Profile picture upload will be available soon
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting
                ? "Creating Profile..."
                : "Complete Profile & Calculate Skill Level"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PlayerOnboarding;
