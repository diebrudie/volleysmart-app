import { getSupabaseClient } from "./clientHolder";

export type FaqPageDisplayed = "faqs" | "homepage_faqs";

/** Raw row shape of the Supabase `faqs` table (includes localized columns). */
export interface FaqRow {
  id: string;
  group_label: string;
  category: string;
  question: string;
  answer: string;
  question_es: string | null;
  answer_es: string | null;
  question_de: string | null;
  answer_de: string | null;
  category_es: string | null;
  category_de: string | null;
  page_displayed: FaqPageDisplayed;
  sort_order: number;
}

/** Localized FAQ ready for display. */
export interface Faq {
  id: string;
  category: string;
  question: string;
  answer: string;
  sort_order: number;
}

/** Pick the localized column for `lang`, falling back to the English column. */
export function localizeFaq(row: FaqRow, lang: string): Faq {
  const suffix = lang === "es" ? "_es" : lang === "de" ? "_de" : null;
  return {
    id: row.id,
    category:
      (suffix && (row[`category${suffix}` as keyof FaqRow] as string)) ||
      row.category,
    question:
      (suffix && (row[`question${suffix}` as keyof FaqRow] as string)) ||
      row.question,
    answer:
      (suffix && (row[`answer${suffix}` as keyof FaqRow] as string)) ||
      row.answer,
    sort_order: row.sort_order,
  };
}

/**
 * All FAQs for the full FAQ page, localized and ordered by category then
 * sort_order. Mirrors apps/web/src/pages/FaqsPage.tsx exactly.
 */
export async function fetchFaqs(lang: string): Promise<Faq[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("faqs")
    .select("*")
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as FaqRow[]).map((row) => localizeFaq(row, lang));
}
