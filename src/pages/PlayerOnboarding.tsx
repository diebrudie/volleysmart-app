import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { createPlayer } from "@/integrations/supabase/players";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import PositionsStep from "@/components/onboarding/PositionsStep";
import SkillRatingStep from "@/components/onboarding/SkillRatingStep";
import PhotoUploadStep from "@/components/onboarding/PhotoUploadStep";
import PersonalDetailsStep from "@/components/onboarding/PersonalDetailsStep";
import { Volleyball } from "lucide-react";

// Define the schema for the form
const formSchema = z.object({
  positions: z.array(z.string()).min(1, "Select at least one position"),
  skillRating: z.number().min(1).max(10),
  imageUrl: z.any().optional(), // Changed to accept File objects
  gender: z.enum(["male", "female", "diverse"]),
  birthday: z.date().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const steps = [
  { id: "positions", title: "Positions" },
  { id: "skillRating", title: "Skill Level" },
  { id: "photoUpload", title: "Photo" },
  { id: "personalDetails", title: "Personal Details" },
];

const PlayerOnboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      positions: [],
      skillRating: 5,
      imageUrl: "",
      gender: "male",
    },
    mode: "onChange",
  });

  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const onSubmit = async (data: FormValues) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to complete onboarding",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // If data.imageUrl is a File, we need to generate a proper URL or handle it differently
      let imageUrl = "";
      
      // If we have imagePreview, use that as the URL (it's a data URL)
      if (imagePreview) {
        imageUrl = imagePreview;
      }

      // Create player profile with the proper image URL
      await createPlayer(user.id, {
        first_name: user.name?.split(' ')[0] || '',
        last_name: user.name?.split(' ').slice(1).join(' ') || '',
        bio: "",
        image_url: imageUrl,
        skill_rating: data.skillRating,
        positions: data.positions,
        member_association: true,
        gender: data.gender,
        birthday: data.birthday,
      });

      toast({
        title: "Success",
        description: "Your player profile has been created",
      });

      // Navigate to the start page
      navigate("/start");
    } catch (error) {
      console.error("Error creating player profile:", error);
      toast({
        title: "Error",
        description: "Failed to create player profile",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <PositionsStep />;
      case 1:
        return <SkillRatingStep />;
      case 2:
        return (
          <PhotoUploadStep 
            imagePreview={imagePreview} 
            setImagePreview={setImagePreview} 
          />
        );
      case 3:
        return <PersonalDetailsStep />;
      default:
        return <PositionsStep />;
    }
  };

  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <Card className="border shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-center mb-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Volleyball className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-center">Complete Your Player Profile</CardTitle>
            <CardDescription className="text-center">
              Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <FormProvider {...form}>
              <form>
                <div className="space-y-6">
                  {renderStepContent()}

                  <div className="flex justify-between pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={prevStep}
                      disabled={currentStep === 0}
                      className={currentStep === 0 ? "invisible" : ""}
                    >
                      Back
                    </Button>

                    {isLastStep ? (
                      <Button
                        onClick={form.handleSubmit(onSubmit)}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Completing..." : "Complete Profile"}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => {
                          const currentStepFields = {
                            0: ["positions"],
                            1: ["skillRating"],
                            2: [], // Photo upload is optional
                            3: ["gender"],
                          }[currentStep];

                          if (currentStepFields.length > 0) {
                            form.trigger(currentStepFields as any).then((isValid) => {
                              if (isValid) nextStep();
                            });
                          } else {
                            nextStep();
                          }
                        }}
                      >
                        Next
                      </Button>
                    )}
                  </div>

                  {/* Progress indicator */}
                  <div className="flex justify-center gap-2 mt-6">
                    {steps.map((_, index) => (
                      <div
                        key={index}
                        className={`h-2 w-10 rounded-full ${
                          index <= currentStep ? "bg-primary" : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </form>
            </FormProvider>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlayerOnboarding;
