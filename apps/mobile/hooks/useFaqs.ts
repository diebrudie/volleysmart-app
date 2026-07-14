import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchFaqs, type Faq } from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";

/** All FAQs for the full FAQ page, localized to the active language. */
export function useFaqs() {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  return useQuery<Faq[]>({
    queryKey: queryKeys.faqs.list(lang),
    queryFn: () => fetchFaqs(lang),
    staleTime: 5 * 60 * 1000,
  });
}
