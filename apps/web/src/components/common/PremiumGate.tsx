import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePremium } from "@/hooks/usePremium";

interface PremiumGateProps {
  children: ReactNode;
  titleKey: string;
  descriptionKey: string;
}

const PremiumGate = ({ children, titleKey, descriptionKey }: PremiumGateProps) => {
  const { t } = useTranslation("common");
  const { isPremium, isLoading } = usePremium();

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-lg">
        <div className="blur-sm pointer-events-none select-none animate-pulse" aria-hidden="true">
          {children}
        </div>
      </div>
    );
  }

  if (isPremium) return <>{children}</>;

  return (
    <div className="relative overflow-hidden rounded-lg">
      <div className="blur-sm pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[1px] rounded-lg">
        <div className="flex flex-col items-center text-center px-6 py-8">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <p className="font-semibold text-foreground text-lg mb-1">
            {t(titleKey)}
          </p>
          <p className="text-sm text-muted-foreground mb-5 max-w-xs">
            {t(descriptionKey)}
          </p>
          <Button variant="primary" size="sm">
            {t("premium.upgrade")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PremiumGate;
