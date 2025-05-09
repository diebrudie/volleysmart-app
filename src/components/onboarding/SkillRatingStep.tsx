
import { useFormContext } from "react-hook-form";
import { Slider } from "@/components/ui/slider";

const SkillRatingStep = () => {
  const { setValue, watch } = useFormContext();
  const skillRating = watch("skillRating") || 5;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">How would you rate your volleyball skills?</h2>
      <p className="text-sm text-gray-500">Rate your skill level from 1 (beginner) to 10 (professional)</p>
      
      <div className="space-y-8 pt-4">
        <Slider
          min={1}
          max={10}
          step={1}
          defaultValue={[skillRating]}
          onValueChange={(vals) => setValue("skillRating", vals[0], { shouldValidate: true })}
          className="mt-6"
        />
        
        <div className="flex justify-between text-xs text-gray-500 px-1">
          <span>Beginner (1)</span>
          <span>Intermediate (5)</span>
          <span>Advanced (10)</span>
        </div>
        
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">{skillRating}</span>
          </div>
        </div>
        
        <div className="text-center font-medium text-gray-700">
          {skillRating <= 3 && "Beginner"}
          {skillRating > 3 && skillRating <= 7 && "Intermediate"}
          {skillRating > 7 && "Advanced"}
        </div>
      </div>
    </div>
  );
};

export default SkillRatingStep;
