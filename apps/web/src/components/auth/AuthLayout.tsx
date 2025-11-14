/**
 * AuthLayout
 * - Forces LIGHT MODE on auth pages before paint (useLayoutEffect)
 * - Prevents any re-addition of the `dark` class while mounted
 * - Restores previous theme on unmount
 */
import React, { PropsWithChildren, useLayoutEffect } from "react";

const THEME_STORAGE_KEY = "volleymatch-theme";

export default function AuthLayout({ children }: PropsWithChildren) {
  useLayoutEffect(() => {
    const html = document.documentElement;

    // Remember state to restore later
    const hadDark = html.classList.contains("dark");
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

    // Force light BEFORE first paint
    html.classList.remove("dark");
    html.classList.add("light"); // harmless utility class if you want to target it
    // Ensure native controls render light
    html.style.setProperty("color-scheme", "light");
    document.body.style.backgroundColor = "#ffffff";
    document.body.style.color = "#0f172a";

    // Guard against any code that re-applies "dark" while we're mounted
    const observer = new MutationObserver(() => {
      if (html.classList.contains("dark")) {
        html.classList.remove("dark");
      }
    });
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
      html.classList.remove("light");
      html.style.removeProperty("color-scheme");
      document.body.style.backgroundColor = "";
      document.body.style.color = "";

      // Restore previous theme
      if (hadDark || savedTheme === "dark") {
        html.classList.add("dark");
      } else {
        html.classList.remove("dark");
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      {children}
    </div>
  );
}
