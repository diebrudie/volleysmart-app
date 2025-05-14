
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { differenceInYears } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth";
import { createPlayer } from "@/integrations/supabase/players";

// Define the schema for the form with age validation
export const formSchema = z.object({
  positions: z.array(z.string()).min(1, "Select at least one position"),
  skillRating: z.number().min(1).max(10),
  imageUrl: z.any().optional(),
  gender: z.enum(["male", "female", "diverse"]),
  birthday: z.date()
    .refine((date) => {
      // Validate the user is at least 18 years old
      return differenceInYears(new Date(), date) >= 18;
    }, "You must be at least 18 years old")
    .optional(),
});

export type FormValues = z.infer<typeof formSchema>;

export const useOnboardingForm = () => {
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

  const nextStep = async () => {
    // Validate the current step fields before proceeding
    const currentStepFields = {
      0: ["positions"],
      1: ["skillRating"],
      2: [], // Photo upload is optional
      3: ["gender", "birthday"],
    }[currentStep];

    if (currentStepFields && currentStepFields.length > 0) {
      const isValid = await form.trigger(currentStepFields as any);
      if (!isValid) return;
    }

    // Only proceed to the next step if validation passed
    setCurrentStep((prev) => Math.min(prev + 1, 3));
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

    // Ensure we only process the submission when on the last step
    if (currentStep !== 3) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // If we have imagePreview, use that as the URL (it's a data URL)
      let imageUrl = imagePreview || "";

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
      
      // Navigate to club page after onboarding is complete
      navigate("/club");
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

  return {
    form,
    currentStep,
    imagePreview,
    setImagePreview,
    isSubmitting,
    nextStep,
    prevStep,
    onSubmit,
  };
};
