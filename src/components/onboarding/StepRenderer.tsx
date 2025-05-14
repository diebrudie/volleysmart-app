
import { FC } from "react";
import PositionsStep from "@/components/onboarding/PositionsStep";
import SkillRatingStep from "@/components/onboarding/SkillRatingStep";
import PhotoUploadStep from "@/components/onboarding/PhotoUploadStep";
import PersonalDetailsStep from "@/components/onboarding/PersonalDetailsStep";

interface StepRendererProps {
  currentStep: number;
  imagePreview: string | null;
  setImagePreview: (preview: string | null) => void;
}

const StepRenderer: FC<StepRendererProps> = ({
  currentStep,
  imagePreview,
  setImagePreview
}) => {
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

export default StepRenderer;
