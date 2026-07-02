import type { Locale } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { es } from "date-fns/locale/es";
import { de } from "date-fns/locale/de";

const localeMap: Record<string, Locale> = { en: enUS, es, de };

export const getDateLocale = (lang: string) =>
  localeMap[lang] || enUS;
