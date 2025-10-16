import React from "react";

/**
 * CopyableClubId
 * Renders an inline "Club ID: U7CTG" with a copy-to-clipboard action.
 * - Copies ONLY the slug (e.g., "U7CTG")
 * - Visual confirmation (icon + "Copied")
 * - Accessible: button role, keyboard focus, aria-live feedback
 */
type CopyableClubIdProps = {
  slug: string;
  label?: string; // defaults to "Club ID"
  className?: string; // optional wrapper classes for layout overrides
  compact?: boolean; // smaller variant for tight spaces
};

export default function CopyableClubId({
  slug,
  label = "Club ID",
  className = "",
  compact = false,
}: CopyableClubIdProps) {
  const [copied, setCopied] = React.useState(false);
  const timeoutRef = React.useRef<number | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(slug);
      setCopied(true);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // no-op: we avoid noisy alerts; user can retry
    }
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const labelClasses = compact
    ? "text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400"
    : "text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400";

  const idClasses = compact
    ? "font-mono font-semibold text-sm text-gray-900 dark:text-gray-100"
    : "font-mono font-semibold text-base text-gray-900 dark:text-gray-100";

  const buttonClasses = compact
    ? "inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
    : "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={labelClasses}>{label}:</span>
      <button
        type="button"
        onClick={handleCopy}
        className={buttonClasses}
        aria-label={`Copy ${label}`}
      >
        <span className={idClasses}>{slug}</span>
        {copied ? (
          // Check icon + "Copied"
          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
            {/* Check icon */}
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 0 1 0 1.414l-7.25 7.25a1 1 0 0 1-1.414 0l-3-3a1 1 0 1 1 1.414-1.414l2.293 2.293 6.543-6.543a1 1 0 0 1 1.414 0Z"
                clipRule="evenodd"
              />
            </svg>
            Copied
          </span>
        ) : (
          // Copy icon
          <svg
            className="h-4 w-4 text-gray-500 dark:text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="9"
              y="9"
              width="13"
              height="13"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <rect
              x="2"
              y="2"
              width="13"
              height="13"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        )}
      </button>

      {/* Live region for screen readers */}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? `${label} copied` : ""}
      </span>
    </div>
  );
}
