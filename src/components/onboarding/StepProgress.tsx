
import { FC } from "react";
import { ONBOARDING_STEPS } from "./onboardingConstants";

interface StepProgressProps {
  currentStep: number;
}

const StepProgress: FC<StepProgressProps> = ({ currentStep }) => {
  return (
    <div className="flex justify-center gap-2 mt-6">
      {ONBOARDING_STEPS.map((_, index) => (
        <div
          key={index}
          className={`h-2 w-10 rounded-full ${
            index <= currentStep ? "bg-primary" : "bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
};

export default StepProgress;
