import { useTranslation } from "react-i18next";
import { applyUpdate, useUpdateAvailable } from "@/lib/appUpdate";

/**
 * "New version" pill pinned to the bottom of the screen. MobileBottomNav sets
 * --bottom-nav-h while it is mounted, so the pill floats just above the navbar.
 */
const UpdateBanner = () => {
  const { t } = useTranslation("common");
  if (!useUpdateAvailable()) return null;

  return (
    <div
      className="fixed inset-x-0 z-50 flex justify-center px-4 pointer-events-none"
      style={{
        bottom:
          "calc(var(--bottom-nav-h, max(env(safe-area-inset-bottom), 0px)) + 12px)",
      }}
    >
      <button
        type="button"
        onClick={() => void applyUpdate()}
        className="pointer-events-auto flex items-center gap-3 rounded-full bg-foreground px-5 py-3 text-sm text-background shadow-lg active:opacity-85"
      >
        <span className="font-medium">{t("update.available")}</span>
        <span className="font-bold underline">{t("update.refresh")}</span>
      </button>
    </div>
  );
};

export default UpdateBanner;
