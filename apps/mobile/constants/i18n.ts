import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import { translations } from "@volleysmart/core";

const deviceLang = getLocales()[0]?.languageCode ?? "en";
const supportedLangs = Object.keys(translations);
const fallback = "en";
const lng = supportedLangs.includes(deviceLang) ? deviceLang : fallback;

i18n.use(initReactI18next).init({
  resources: translations,
  lng,
  fallbackLng: fallback,
  defaultNS: "common",
  interpolation: { escapeValue: false },
});

export default i18n;
