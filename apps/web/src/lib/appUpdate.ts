import { toast } from "sonner";
import i18n from "@/i18n";

// Baked in at build time (vite.config.ts), also written to /version.json
export const APP_VERSION = __APP_VERSION__;

const CHECK_INTERVAL_MS = 30 * 60 * 1000;

async function applyUpdate() {
  const reg = await navigator.serviceWorker?.getRegistration();
  if (reg?.waiting) {
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => window.location.reload(),
      { once: true }
    );
    reg.waiting.postMessage({ type: "SKIP_WAITING" });
    // Safety net in case controllerchange never fires
    window.setTimeout(() => window.location.reload(), 3000);
  } else {
    window.location.reload();
  }
}

/** Fetches /version.json and shows the refresh toast if it differs. */
export async function checkForUpdate(): Promise<boolean> {
  try {
    const res = await fetch("/version.json", { cache: "no-store" });
    if (!res.ok) return false;
    const { version } = (await res.json()) as { version?: string };
    if (!version || version === APP_VERSION) return false;
  } catch {
    return false; // offline or not deployed yet
  }

  toast(i18n.t("update.available"), {
    id: "app-update",
    duration: Infinity,
    action: { label: i18n.t("update.refresh"), onClick: () => void applyUpdate() },
  });
  return true;
}

/** Check on start, when the app returns to foreground, and periodically. */
export function startUpdateChecks() {
  void checkForUpdate();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void checkForUpdate();
  });
  window.setInterval(() => void checkForUpdate(), CHECK_INTERVAL_MS);
}
