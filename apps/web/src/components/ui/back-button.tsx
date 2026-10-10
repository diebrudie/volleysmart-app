import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGoBack } from "@/hooks/useGoBack";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  /** Explicit path to go back to. If omitted, uses browser history (-1). */
  to?: string;
  label?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  to,
  label = "Back",
}) => {
  const navigate = useNavigate();
  const goBack = useGoBack();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1 pl-1 text-muted-foreground hover:text-foreground -ml-1"
      onClick={() => (to ? navigate(to) : goBack())}
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </Button>
  );
};
