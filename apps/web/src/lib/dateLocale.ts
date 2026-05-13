import i18n from "@/i18n";
import { getDateLocale as getDateLocaleByLang } from "@volleysmart/core";

export const getDateLocale = () => getDateLocaleByLang(i18n.language);
