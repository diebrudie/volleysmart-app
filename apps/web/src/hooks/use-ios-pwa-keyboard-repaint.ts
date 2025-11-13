import { useEffect } from "react";

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

function isIOSStandalone(): boolean {
  const ios =
    typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const standalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
      (typeof navigator !== "undefined" &&
        "standalone" in navigator &&
        (navigator as NavigatorWithStandalone).standalone === true));
  return ios && standalone;
}

/**
 * Forces a lightweight repaint in iOS PWA when the keyboard layout changes
 * (e.g., letters → numbers) but the keyboard UI fails to visually update.
 *
 * Safe: only affects iOS standalone PWAs; no-ops elsewhere.
 */
export function useIosPwaKeyboardRepaint(enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled || !isIOSStandalone()) return;

    let raf1: number | null = null;
    let timeoutId: number | null = null;

    const forceRepaint = () => {
      // Toggle a tiny transform on html & body to force a repaint without relayout.
      const html = document.documentElement;
      const body = document.body;
      html.style.transform = "translateZ(0)";
      body.style.transform = "translateZ(0)";

      // Clear on next frame
      raf1 = requestAnimationFrame(() => {
        html.style.transform = "";
        body.style.transform = "";
      });
    };

    const onFocusIn = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        // small delay lets iOS flip the layout then we repaint
        timeoutId = window.setTimeout(forceRepaint, 80);
      }
    };

    const onPointerUp = (e: Event) => {
      // tapping the field again to switch layout sometimes needs another repaint
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        forceRepaint();
      }
    };

    const vv: VisualViewport | null =
      typeof window !== "undefined" ? window.visualViewport ?? null : null;
    const onVVResize = () => {
      // when keyboard height / layout changes, repaint
      forceRepaint();
    };

    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("pointerup", onPointerUp, true);
    vv?.addEventListener("resize", onVVResize);

    return () => {
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      vv?.removeEventListener("resize", onVVResize);
      if (raf1) cancelAnimationFrame(raf1);
      if (timeoutId) clearTimeout(timeoutId);
      // ensure any transforms are cleared
      const html = document.documentElement;
      const body = document.body;
      html.style.transform = "";
      body.style.transform = "";
    };
  }, [enabled]);
}
