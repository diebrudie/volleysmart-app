import * as React from "react";
import { useTheme } from "@/contexts/ThemeContext";
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
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Shows as Drawer on compact screens, Dialog on larger screens. */
const ThemePicker: React.FC<Props> = ({ open, onOpenChange }) => {
  const { theme, setTheme } = useTheme();
  const isCompact = useIsCompact();

  const Body = (
    <div className="p-4 space-y-3">
      <Option
        label="Light"
        active={theme === "light"}
        onClick={() => setTheme("light")}
      />
      <Option
        label="Dark"
        active={theme === "dark"}
        onClick={() => setTheme("dark")}
      />
      <Option
        label="System"
        active={theme === "system"}
        onClick={() => setTheme("system")}
      />
    </div>
  );

  if (isCompact) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="fixed right-0 top-0 h-[100dvh] w-screen max-w-none p-0 bg-background z-[70]">
          <DrawerHeader className="flex items-center justify-between px-4 py-3 border-b">
            <DrawerTitle>Theme</DrawerTitle>
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
        <DialogHeader className="flex items-center justify-between">
          <DialogTitle>Theme</DialogTitle>
          <DialogClose asChild>
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
          </DialogClose>
        </DialogHeader>
        {Body}
      </DialogContent>
    </Dialog>
  );
};

export default ThemePicker;

const Option: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => (
  <Button
    variant={active ? "default" : "outline"}
    className="w-full justify-start"
    onClick={onClick}
  >
    {label}
  </Button>
);
