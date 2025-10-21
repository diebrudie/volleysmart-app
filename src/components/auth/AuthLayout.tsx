import React, { PropsWithChildren, useEffect } from "react";
import { Link } from "react-router-dom";

const THEME_STORAGE_KEY = "volleymatch-theme";

/**
 * AuthLayout
 * - Forces light mode on all auth screens (Login/Signup/Reset/Forgot/Verify)
 * - Restores user's saved theme when leaving these screens
 * - Uses a logo suitable for light backgrounds
 */
export default function AuthLayout({ children }: PropsWithChildren) {
  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains("dark");

    // Force light mode while on auth screens
    html.classList.remove("dark");

    return () => {
      // Restore saved preference (or prior state if storage not available)
      try {
        const saved =
          (localStorage.getItem(THEME_STORAGE_KEY) as
            | "light"
            | "dark"
            | "system") || "light";

        if (saved === "dark") {
          html.classList.add("dark");
        } else if (saved === "light") {
          html.classList.remove("dark");
        } else {
          const prefersDark = window.matchMedia(
            "(prefers-color-scheme: dark)"
          ).matches;
          html.classList.toggle("dark", prefersDark);
        }
      } catch {
        // Fallback: restore to whatever was there before
        html.classList.toggle("dark", hadDark);
      }
    };
  }, []);

  // TODO: Point this to your dark-on-light logo asset (visible on white bg)
  const LIGHT_PAGE_LOGO = "public/logo-lightmode.svg";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link to="/" className="inline-flex items-center">
            <img
              src={LIGHT_PAGE_LOGO}
              alt="VolleyMatch"
              className="h-10 w-auto"
            />
          </Link>
        </div>
        <p className="mt-2 text-center text-sm text-gray-600">
          Create balanced volleyball teams with ease
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">{children}</div>
    </div>
  );
}
