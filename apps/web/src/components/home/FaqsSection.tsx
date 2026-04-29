import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import ReactMarkdown from "react-markdown";
import ContactSheet from "@/components/common/ContactSheet";

type FaqPageDisplayed = "faqs" | "homepage_faqs";

interface FaqRow {
  id: string;
  group_label: string;
  category: string;
  question: string;
  answer: string;
  question_es: string | null;
  answer_es: string | null;
  question_de: string | null;
  answer_de: string | null;
  page_displayed: FaqPageDisplayed;
  sort_order: number;
}

interface Faq {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
}

function localizeFaq(row: FaqRow, lang: string): Faq {
  const suffix = lang === "es" ? "_es" : lang === "de" ? "_de" : null;
  return {
    id: row.id,
    question: (suffix && row[`question${suffix}` as keyof FaqRow] as string) || row.question,
    answer: (suffix && row[`answer${suffix}` as keyof FaqRow] as string) || row.answer,
    sort_order: row.sort_order,
  };
}

const FaqsSection = () => {
  const { t, i18n } = useTranslation("home");
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isContactOpen, setIsContactOpen] = useState<boolean>(false);

  useEffect(() => {
    const loadFaqs = async () => {
      setIsLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from("faqs")
        .select("*")
        .eq("page_displayed", "homepage_faqs")
        .order("sort_order", { ascending: true });

      if (queryError) {
        // Log to console for debugging, show generic message to user
        console.error("Error loading homepage FAQs:", queryError);
        setError(
          "We could not load the FAQs right now. Please try again later."
        );
        setIsLoading(false);
        return;
      }

      setFaqs((data ?? []).map((row: FaqRow) => localizeFaq(row, i18n.language)));
      setIsLoading(false);
    };

    void loadFaqs();
  }, [i18n.language]);

  return (
    <section id="faqs" className="bg-white text-gray-900">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-6 py-16 lg:py-16">
        {/* Heading */}
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
            {t("faqs.heading")}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {t("faqs.subheading")}
          </p>
        </div>

        {/* FAQ list */}
        <div className="border-t border-gray-200">
          {isLoading && (
            <p className="py-12 text-center text-muted-foreground">
              {t("faqs.loading")}
            </p>
          )}

          {!isLoading && error && (
            <p className="py-8 text-center text-red-600 text-sm">{error}</p>
          )}

          {!isLoading && !error && faqs.length === 0 && (
            <p className="py-8 text-center text-gray-600">
              {t("faqs.empty")}
            </p>
          )}

          {!isLoading && !error && faqs.length > 0 && (
            <Accordion type="single" collapsible>
              {faqs.map((faq) => (
                <AccordionItem
                  key={faq.id}
                  value={faq.id}
                  className="border-b border-gray-200"
                >
                  <AccordionTrigger className="py-6 pl-2 text-left text-base sm:text-lg font-medium text-gray-900">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm pl-2 sm:text-base text-gray-600">
                    <div className="prose prose-sm sm:prose-base max-w-none prose-a:underline">
                      <ReactMarkdown>{faq.answer}</ReactMarkdown>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>

        {/* Still have questions */}
        <div className="mt-12 sm:mt-16 border-b border-gray-200 pb-16 text-center">
          <h3 className="text-2xl sm:text-3xl font-semibold">
            {t("faqs.stillHaveQuestions")}
          </h3>
          <p className="mt-3 text-base text-gray-600">
            {t("faqs.stillHaveQuestionsDescription")}
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/faqs">
              <Button
                size="lg"
                className="bg-black text-white border border-black hover:bg-[hsl(var(--primary))] hover:text-white hover:border-[hsl(var(--primary))]"
              >
                {t("faqs.viewAll")}
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="border-black text-black bg-white hover:bg-black hover:text-white"
              onClick={() => setIsContactOpen(true)}
            >
              {t("faqs.contactUs")}
            </Button>
          </div>
        </div>
      </div>

      <ContactSheet
        open={isContactOpen}
        onOpenChange={setIsContactOpen}
        source="homepage_faqs_section"
        forceLight
      />
    </section>
  );
};

export default FaqsSection;
