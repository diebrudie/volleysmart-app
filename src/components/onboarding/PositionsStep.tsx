
import { useState, useEffect } from "react";
import { getAllPositions } from "@/integrations/supabase/positions";
import { useFormContext } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";

const PositionsStep = () => {
  const [positions, setPositions] = useState<{ id: string; name: string }[]>([]);
  const { setValue, watch, formState: { errors } } = useFormContext();
  const { toast } = useToast();
  const selectedPositions = watch("positions") || [];

  useEffect(() => {
    const loadPositions = async () => {
      try {
        const positionsData = await getAllPositions();
        setPositions(positionsData);
      } catch (error) {
        console.error("Error loading positions:", error);
        toast({
          title: "Error",
          description: "Failed to load player positions",
          variant: "destructive",
        });
      }
    };

    loadPositions();
  }, [toast]);

  const togglePosition = (positionId: string) => {
    const updatedPositions = selectedPositions.includes(positionId)
      ? selectedPositions.filter(id => id !== positionId)
      : [...selectedPositions, positionId];
    
    setValue("positions", updatedPositions, { shouldValidate: true });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Which positions do you play?</h2>
      <p className="text-sm text-gray-500">Select one or more positions that you're comfortable playing</p>
      
      {errors.positions && (
        <FormMessage>{errors.positions.message as string}</FormMessage>
      )}
      
      <div className="grid grid-cols-2 gap-4 mt-4">
        {positions.map((position) => {
          const isSelected = selectedPositions.includes(position.id);
          
          return (
            <div
              key={position.id}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                isSelected 
                  ? "bg-primary/10 border-primary" 
                  : "bg-white hover:bg-gray-50"
              }`}
              onClick={() => togglePosition(position.id)}
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center h-4 w-4">
                  <Checkbox
                    id={`position-${position.id}`}
                    checked={isSelected}
                    // Completely remove any change handlers from the checkbox itself
                    // This is crucial to prevent the infinite update loop
                  />
                </div>
                <label
                  htmlFor={`position-${position.id}`}
                  className="font-medium cursor-pointer"
                >
                  {position.name}
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PositionsStep;
