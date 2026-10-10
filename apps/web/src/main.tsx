import { createRoot } from "react-dom/client";
import "./i18n";
import App from "./App.tsx";
import "./index.css";
import { APP_VERSION, startUpdateChecks } from "./lib/appUpdate";

createRoot(document.getElementById("root")!).render(<App />);

// Register minimal service worker in production for installability.
// The version query gives each deploy its own SW and cache.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`/sw.js?v=${APP_VERSION}`)
      .then(() => console.log("Service Worker registered ✅"))
      .catch((err) => console.error("SW registration failed:", err));
  });
}

if (import.meta.env.PROD) startUpdateChecks();
