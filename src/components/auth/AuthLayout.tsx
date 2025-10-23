/**
 * AuthLayout
 * - Forces LIGHT MODE while on auth pages (login/signup/forgot/reset/verify)
 * - Restores the user's original theme on unmount
 * - Provides a plain, no-card page shell; each screen controls its own layout
 */
import React, { PropsWithChildren, useEffect } from "react";

const THEME_STORAGE_KEY = "volleymatch-theme";

export default function AuthLayout({ children }: PropsWithChildren) {
  useEffect(() => {
    const html = document.documentElement;

    // Remember whether dark class was present so we can restore it
    const hadDark = html.classList.contains("dark");
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

    // Force light mode for the whole page while on auth
    html.classList.remove("dark");
    html.classList.add("light");

    // Also prevent any system/dark overrides on the body
    document.body.style.backgroundColor = "#ffffff";
    document.body.style.color = "#0f172a";

    return () => {
      // Restore prior theme preference (class + storage drives your ThemeContext)
      html.classList.remove("light");
      if (hadDark || savedTheme === "dark") {
        html.classList.add("dark");
        document.body.style.backgroundColor = "";
        document.body.style.color = "";
      } else {
        document.body.style.backgroundColor = "";
        document.body.style.color = "";
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      {children}
    </div>
  );
}
