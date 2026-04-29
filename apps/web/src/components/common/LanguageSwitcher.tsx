import * as React from "react";
import { useTranslation } from "react-i18next";
import { useIsCompact } from "@/hooks/use-compact";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
] as const;

const LanguageSwitcher: React.FC<Props> = ({ open, onOpenChange }) => {
  const { i18n, t } = useTranslation("common");
  const isCompact = useIsCompact();

  const handleChange = (code: string) => {
    i18n.changeLanguage(code);
    onOpenChange(false);
  };

  const Body = (
    <div className="p-4 space-y-3">
      {LANGUAGES.map(({ code, label }) => (
        <Button
          key={code}
          variant={i18n.language === code ? "default" : "outline"}
          className="w-full justify-start"
          onClick={() => handleChange(code)}
        >
          {label}
        </Button>
      ))}
    </div>
  );

  const title = t("language.title");

  if (isCompact) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="fixed right-0 top-0 h-[100dvh] w-screen max-w-none p-0 bg-background z-[70]">
          <DrawerHeader className="flex items-center justify-between px-4 py-3 border-b">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" aria-label="Close">
                <span className="sr-only">Close</span>
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path
                    d="M6 6l12 12M6 18L18 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </Button>
            </DrawerClose>
          </DrawerHeader>
          {Body}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {Body}
      </DialogContent>
    </Dialog>
  );
};

export default LanguageSwitcher;
