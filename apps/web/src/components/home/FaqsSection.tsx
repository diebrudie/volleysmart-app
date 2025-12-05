import { useEffect, useState } from "react";
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

interface Faq {
  id: string;
  group_label: string;
  category: string;
  question: string;
  answer: string;
  page_displayed: FaqPageDisplayed;
  sort_order: number;
}

const FaqsSection = () => {
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

      setFaqs((data ?? []) as Faq[]);
      setIsLoading(false);
    };

    void loadFaqs();
  }, []);

  return (
    <section id="faqs" className="bg-white text-gray-900">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-6 py-16 lg:py-16">
        {/* Heading */}
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
            FAQs
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Find quick answers to how VolleySmart works — from creating Clubs
            and generating fair teams to tracking games and managing your
            players.
          </p>
        </div>

        {/* FAQ list */}
        <div className="border-t border-gray-200">
          {isLoading && (
            <p className="py-12 text-center text-muted-foreground">
              Loading FAQs...
            </p>
          )}

          {!isLoading && error && (
            <p className="py-8 text-center text-red-600 text-sm">{error}</p>
          )}

          {!isLoading && !error && faqs.length === 0 && (
            <p className="py-8 text-center text-gray-600">
              No FAQs available yet.
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
            Still have questions?
          </h3>
          <p className="mt-3 text-base text-gray-600">
            If you didn’t find what you were looking for, you can browse all
            FAQs or reach out to us directly. We’re happy to help.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/faqs">
              <Button
                size="lg"
                className="bg-black text-white border border-black hover:bg-[hsl(var(--primary))] hover:text-white hover:border-[hsl(var(--primary))]"
              >
                View all FAQs
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="border-black text-black bg-white hover:bg-black hover:text-white"
              onClick={() => setIsContactOpen(true)}
            >
              Contact us
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
