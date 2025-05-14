
import { FormProvider } from "react-hook-form";
import { Volleyball } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useOnboardingForm } from "@/hooks/useOnboardingForm";
import StepRenderer from "@/components/onboarding/StepRenderer";
import StepProgress from "@/components/onboarding/StepProgress";
import { ONBOARDING_STEPS } from "@/components/onboarding/onboardingConstants";

const PlayerOnboarding = () => {
  const {
    form,
    currentStep,
    imagePreview,
    setImagePreview,
    isSubmitting,
    nextStep,
    prevStep,
    onSubmit
  } = useOnboardingForm();

  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

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
              Step {currentStep + 1} of {ONBOARDING_STEPS.length}: {ONBOARDING_STEPS[currentStep].title}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <FormProvider {...form}>
              <form onSubmit={(e) => {
                e.preventDefault();
                // Only call onSubmit when the form is manually submitted on the last step
                if (isLastStep) {
                  form.handleSubmit(onSubmit)(e);
                }
              }}>
                <div className="space-y-6">
                  <StepRenderer 
                    currentStep={currentStep}
                    imagePreview={imagePreview} 
                    setImagePreview={setImagePreview} 
                  />

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
                        type="submit"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Submitting..." : "Submit"}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={nextStep}
                      >
                        Next
                      </Button>
                    )}
                  </div>

                  <StepProgress currentStep={currentStep} />
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
