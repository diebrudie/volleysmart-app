import { useState, useEffect } from "react";
import { getAllPositions } from "@/integrations/supabase/positions";
import { useFormContext } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { FormMessage } from "@/components/ui/form";
import { Check, AlertCircle } from "lucide-react";

const DEFAULT_POSITIONS = [
  { id: "setter", name: "Setter" },
  { id: "outside", name: "Outside Hitter" },
  { id: "middle", name: "Middle Blocker" },
  { id: "opposite", name: "Opposite" },
  { id: "libero", name: "Libero" }
];

const PositionsStep = () => {
  const [positions, setPositions] = useState<{ id: string; name: string }[]>(DEFAULT_POSITIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const { setValue, watch, formState: { errors } } = useFormContext();
  const { toast } = useToast();
  const selectedPositions = watch("positions") || [];

  useEffect(() => {
    const loadPositions = async () => {
      setIsLoading(true);
      try {
        const positionsData = await getAllPositions();
        if (positionsData && positionsData.length > 0) {
          setPositions(positionsData);
          setLoadError(false);
        } else {
          // If no positions returned, keep using default ones
          console.log("No positions returned from database, using defaults");
        }
      } catch (error) {
        console.error("Error loading positions:", error);
        setLoadError(true);
        toast({
          title: "Error",
          description: "Failed to load player positions. Using default positions instead.",
          variant: "destructive",
        });
        // Keep using default positions
      } finally {
        setIsLoading(false);
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

  if (isLoading) {
    return (
      <div className="space-y-4 text-center py-8">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Which positions do you play?</h2>
      <p className="text-sm text-gray-500">Select one or more positions that you're comfortable playing</p>
      
      {loadError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-center space-x-2 text-sm text-yellow-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p>Using default positions. You can continue with your selection.</p>
        </div>
      )}
      
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
                <div className="h-4 w-4 rounded-sm border flex items-center justify-center bg-white">
                  {isSelected && (
                    <Check className="h-3 w-3 text-primary" />
                  )}
                </div>
                <label
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
