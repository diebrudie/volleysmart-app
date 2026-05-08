import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "./locales/en/common.json";
import enHome from "./locales/en/home.json";
import enAuth from "./locales/en/auth.json";
import enOnboarding from "./locales/en/onboarding.json";
import enEvents from "./locales/en/events.json";
import enGames from "./locales/en/games.json";
import enClubs from "./locales/en/clubs.json";
import enProfile from "./locales/en/profile.json";
import enNotifications from "./locales/en/notifications.json";
import enValidation from "./locales/en/validation.json";
import enLegal from "./locales/en/legal.json";

import esCommon from "./locales/es/common.json";
import esHome from "./locales/es/home.json";
import esAuth from "./locales/es/auth.json";
import esOnboarding from "./locales/es/onboarding.json";
import esEvents from "./locales/es/events.json";
import esGames from "./locales/es/games.json";
import esClubs from "./locales/es/clubs.json";
import esProfile from "./locales/es/profile.json";
import esNotifications from "./locales/es/notifications.json";
import esValidation from "./locales/es/validation.json";
import esLegal from "./locales/es/legal.json";

import deCommon from "./locales/de/common.json";
import deHome from "./locales/de/home.json";
import deAuth from "./locales/de/auth.json";
import deOnboarding from "./locales/de/onboarding.json";
import deEvents from "./locales/de/events.json";
import deGames from "./locales/de/games.json";
import deClubs from "./locales/de/clubs.json";
import deProfile from "./locales/de/profile.json";
import deNotifications from "./locales/de/notifications.json";
import deValidation from "./locales/de/validation.json";
import deLegal from "./locales/de/legal.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        home: enHome,
        auth: enAuth,
        onboarding: enOnboarding,
        events: enEvents,
        games: enGames,
        clubs: enClubs,
        profile: enProfile,
        notifications: enNotifications,
        validation: enValidation,
        legal: enLegal,
      },
      es: {
        common: esCommon,
        home: esHome,
        auth: esAuth,
        onboarding: esOnboarding,
        events: esEvents,
        games: esGames,
        clubs: esClubs,
        profile: esProfile,
        notifications: esNotifications,
        validation: esValidation,
        legal: esLegal,
      },
      de: {
        common: deCommon,
        home: deHome,
        auth: deAuth,
        onboarding: deOnboarding,
        events: deEvents,
        games: deGames,
        clubs: deClubs,
        profile: deProfile,
        notifications: deNotifications,
        validation: deValidation,
        legal: deLegal,
      },
    },
    fallbackLng: "en",
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "volleysmart-lang",
      caches: ["localStorage"],
    },
  });

i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
});

export default i18n;
