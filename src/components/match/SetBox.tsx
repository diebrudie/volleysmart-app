import React, { useState, KeyboardEvent, useRef, useEffect } from "react";
import { Pencil } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Detect iOS standalone PWA
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}
const isIOS =
  typeof navigator !== "undefined" &&
  /iPhone|iPad|iPod/i.test(navigator.userAgent);

const isStandalone =
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    (typeof navigator !== "undefined" &&
      "standalone" in navigator &&
      (navigator as NavigatorWithStandalone).standalone === true));

interface SetBoxProps {
  setNumber: number;
  teamAScore?: number | null;
  teamBScore?: number | null;
  onScoreUpdate?: (
    setNumber: number,
    teamAScore: number,
    teamBScore: number
  ) => void;
  isLarge?: boolean;
  isEditingAllowed?: boolean;
}

const SetBox: React.FC<SetBoxProps> = ({
  setNumber,
  teamAScore = null,
  teamBScore = null,
  onScoreUpdate,
  isLarge = false,
  isEditingAllowed = true,
}) => {
  const [localTeamAScore, setLocalTeamAScore] = useState<string>(
    teamAScore && teamAScore > 0 ? String(teamAScore) : ""
  );
  const [localTeamBScore, setLocalTeamBScore] = useState<string>(
    teamBScore && teamBScore > 0 ? String(teamBScore) : ""
  );
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const teamAInputRef = useRef<HTMLInputElement>(null);
  const [keyboardInset, setKeyboardInset] = useState<number>(0);
  const drawerContentRef = useRef<HTMLDivElement>(null);

  // Tracks the first time the sheet opens on mobile to harden focus timing
  const firstOpenPrimedRef = useRef<boolean>(false);

  // Update local state when props change (important for when switching between games)
  useEffect(() => {
    setLocalTeamAScore(teamAScore && teamAScore > 0 ? String(teamAScore) : "");
    setLocalTeamBScore(teamBScore && teamBScore > 0 ? String(teamBScore) : "");
  }, [teamAScore, teamBScore]);

  const hasBeenPlayed =
    teamAScore !== null &&
    teamBScore !== null &&
    (teamAScore > 0 || teamBScore > 0);

  const getOpacity = () => {
    switch (setNumber) {
      case 1:
        return "0.3";
      case 2:
        return "0.45";
      case 3:
        return "0.6";
      case 4:
        return "0.75";
      case 5:
        return "0.9";
      default:
        return "0.6";
    }
  };

  const getBackgroundColor = () => {
    if (hasBeenPlayed) {
      return `rgba(251, 190, 36, ${getOpacity()})`; // Yellow with opacity
    } else {
      return `rgba(156, 163, 175, ${getOpacity()})`; // Better gray with opacity
    }
  };

  const handleSubmit = () => {
    if (!onScoreUpdate) return;
    const a = parseInt(localTeamAScore, 10);
    const b = parseInt(localTeamBScore, 10);
    const aVal = Number.isFinite(a) ? a : 0;
    const bVal = Number.isFinite(b) ? b : 0;
    onScoreUpdate(setNumber, aVal, bVal);
    setIsOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isMobile) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const focusAndCenterFirstInput = () => {
    const el = teamAInputRef.current;
    if (!el) return;

    const doFocus = () => {
      el.focus();
      try {
        el.setSelectionRange?.(0, String(el.value ?? "").length);
      } catch {
        // ignore selection errors on numeric inputs
      }
      el.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "smooth",
      });
    };

    // On first ever open on iOS, the initial focus can be ignored during animation.
    if (!firstOpenPrimedRef.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.setTimeout(doFocus, isIOS ? 250 : 120);
        });
      });

      const vv =
        typeof window !== "undefined" ? window.visualViewport ?? null : null;
      const oneShot = () => {
        doFocus();
        vv?.removeEventListener("resize", oneShot);
      };
      vv?.addEventListener("resize", oneShot, { once: true });

      firstOpenPrimedRef.current = true;
    } else {
      requestAnimationFrame(() => window.setTimeout(doFocus, 100));
    }
  };

  const resetLocalScores = () => {
    setLocalTeamAScore(teamAScore && teamAScore > 0 ? String(teamAScore) : "");
    setLocalTeamBScore(teamBScore && teamBScore > 0 ? String(teamBScore) : "");
  };

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      resetLocalScores();
      // Lock immediately to stabilize layout (esp. iOS PWA) before focusing
      if (isMobile) lockBodyScroll();

      // Recompute keyboard inset once after lock (microtask)
      Promise.resolve().then(() => {
        const vv =
          typeof window !== "undefined" ? window.visualViewport ?? null : null;
        if (vv) {
          const vh = window.innerHeight;
          setKeyboardInset(Math.max(0, vh - vv.height));
        }
      });

      focusAndCenterFirstInput();
    } else {
      unlockBodyScroll();
    }
  };

  // Body scroll lock (works on iOS standalone)
  const scrollYBeforeLock = useRef<number>(0);

  function lockBodyScroll(): void {
    if (document.body.style.position === "fixed") return;
    scrollYBeforeLock.current = window.scrollY;
    const body = document.body;
    body.style.position = "fixed";
    body.style.top = `-${scrollYBeforeLock.current}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overscrollBehaviorY = "contain";
  }

  function unlockBodyScroll(): void {
    if (document.body.style.position !== "fixed") return;
    const body = document.body;
    const y = scrollYBeforeLock.current;
    body.style.position = "";
    body.style.top = "";
    body.style.left = "";
    body.style.right = "";
    body.style.width = "";
    body.style.overscrollBehaviorY = "";
    window.scrollTo(0, y);
  }

  /**
   * Keyboard-avoidance for mobile Drawer using the Visual Viewport API.
   * We compute an inset so the content sits above the keyboard.
   */
  useEffect(() => {
    if (!isMobile || !isOpen) return;

    const vv: VisualViewport | null =
      typeof window !== "undefined" ? window.visualViewport ?? null : null;
    if (!vv) return;

    const onResize = () => {
      const vh = window.innerHeight;
      // offsetTop is unstable on iOS; use simple delta everywhere
      const inset = Math.max(0, vh - vv.height);
      setKeyboardInset(inset);

      // Keep the first input centered if keyboard changed size
      const el = teamAInputRef.current;
      if (el)
        el.scrollIntoView({
          block: "center",
          inline: "nearest",
          behavior: "smooth",
        });
    };

    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    onResize();

    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
      setKeyboardInset(0);
    };
  }, [isMobile, isOpen]);

  // Lock body scroll while the drawer is open (fixed-position lock works in iOS standalone PWAs)
  useEffect(() => {
    if (!(isMobile && isOpen)) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [isMobile, isOpen]);

  return (
    <div
      className={cn(
        "rounded-lg p-6 flex flex-col items-center justify-center relative h-full",
        isLarge && "p-10 md:p-12"
      )}
      style={{ backgroundColor: getBackgroundColor() }}
    >
      <h3
        className={cn(
          "font-serif mb-4 text-center font-bold text-gray-900 dark:text-gray-100",
          "text-xl"
        )}
      >
        SET {setNumber}
      </h3>

      <div
        className={cn(
          "font-bold mb-3 text-center whitespace-nowrap min-w-0 overflow-hidden text-gray-900 dark:text-gray-100",
          "text-3xl"
        )}
      >
        {hasBeenPlayed ? teamAScore : "0"} - {hasBeenPlayed ? teamBScore : "0"}
      </div>

      <p className="text-sm text-center text-gray-700 dark:text-gray-300">
        Team A vs. Team B
      </p>

      {isEditingAllowed && (
        <>
          {/* Desktop / tablet: keep Dialog */}
          {!isMobile && (
            <Dialog open={isOpen} onOpenChange={handleOpen}>
              <DialogTrigger asChild>
                <button className="absolute top-2 right-2 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors">
                  <Pencil className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                </button>
              </DialogTrigger>
              <DialogContent
                onOpenAutoFocus={(e) => {
                  /* we already manage focus */ e.preventDefault();
                }}
              >
                <DialogHeader>
                  <DialogTitle className="text-center">
                    Update Set {setNumber} Score
                  </DialogTitle>
                </DialogHeader>

                <div className="py-6">
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <div className="text-center">
                      <p className="text-sm font-medium mb-2 text-red-500">
                        Team A
                      </p>
                      <input
                        ref={teamAInputRef}
                        type="number"
                        inputMode="numeric"
                        min="0"
                        placeholder="0"
                        value={localTeamAScore}
                        onChange={(e) => setLocalTeamAScore(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-20 h-14 text-center text-2xl border-2 rounded-md border-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    <div className="text-2xl font-medium self-end text-gray-900 dark:text-gray-100">
                      vs.
                    </div>

                    <div className="text-center">
                      <p className="text-sm font-medium mb-2 text-emerald-500">
                        Team B
                      </p>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        placeholder="0"
                        value={localTeamBScore}
                        onChange={(e) => setLocalTeamBScore(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-20 h-14 text-center text-2xl border-2 rounded-md border-emerald-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <Button variant="primary" onClick={handleSubmit}>
                      Submit
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Mobile: Drawer to stay above keyboard */}
          {isMobile && (
            <Drawer open={isOpen} onOpenChange={handleOpen}>
              <DrawerTrigger asChild>
                <button className="absolute top-2 right-2 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors">
                  <Pencil className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                </button>
              </DrawerTrigger>
              <DrawerContent
                ref={drawerContentRef}
                onOpenAutoFocus={(e) => e.preventDefault()}
                onPointerDownOutside={(e) => e.preventDefault()}
                /**
                 * Safe-area + keyboard inset so content sits above the iOS keyboard.
                 * The 16px gives a little breathing space over the keyboard.
                 */
                style={{
                  paddingBottom: `calc(${keyboardInset}px + env(safe-area-inset-bottom))`,
                }}
                className="max-h-[85svh] overflow-y-auto"
              >
                <DrawerHeader className="text-center">
                  <DrawerTitle>Update Set {setNumber} Score</DrawerTitle>
                </DrawerHeader>

                <div className="py-4">
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <div className="text-center">
                      <p className="text-sm font-medium mb-2 text-red-500">
                        Team A
                      </p>
                      <input
                        ref={teamAInputRef}
                        type="number"
                        inputMode="numeric"
                        min="0"
                        placeholder="0"
                        value={localTeamAScore}
                        onChange={(e) => setLocalTeamAScore(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-20 h-14 text-center text-2xl border-2 rounded-md border-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    <div className="text-2xl font-medium self-end text-gray-900 dark:text-gray-100">
                      vs.
                    </div>

                    <div className="text-center">
                      <p className="text-sm font-medium mb-2 text-emerald-500">
                        Team B
                      </p>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        placeholder="0"
                        value={localTeamBScore}
                        onChange={(e) => setLocalTeamBScore(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-20 h-14 text-center text-2xl border-2 rounded-md border-emerald-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>

                  <div className="flex justify-center gap-3 pb-2">
                    <DrawerClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DrawerClose>
                    <Button variant="primary" onClick={handleSubmit}>
                      Submit
                    </Button>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          )}
        </>
      )}
    </div>
  );
};

export default SetBox;
