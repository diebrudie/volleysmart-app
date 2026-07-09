import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { translations } from "@volleysmart/core";

export const LANG_STORAGE_KEY = "volleysmart-lang";

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

// A manually chosen language (LanguagePickerSheet) overrides the device locale.
AsyncStorage.getItem(LANG_STORAGE_KEY)
  .then((saved) => {
    if (saved && supportedLangs.includes(saved) && saved !== i18n.language) {
      i18n.changeLanguage(saved);
    }
  })
  .catch(() => {});

export default i18n;
