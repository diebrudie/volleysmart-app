import { useEffect, useMemo, useState, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import ReactMarkdown from "react-markdown";

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

const FaqsPage = () => {
  const navigate = useNavigate();
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFaqs = async () => {
      setIsLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from("faqs")
        .select("*")
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true });

      if (queryError) {
        console.error("Error loading FAQs:", queryError);
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

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;
    const query = searchQuery.toLowerCase();
    return faqs.filter((faq) => faq.question.toLowerCase().includes(query));
  }, [faqs, searchQuery]);

  const faqsByCategory = useMemo(() => {
    const grouped = new Map<string, Faq[]>();
    filteredFaqs.forEach((faq) => {
      const key = faq.category;
      const existing = grouped.get(key) ?? [];
      grouped.set(key, [...existing, faq]);
    });
    return Array.from(grouped.entries());
  }, [filteredFaqs]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Fixed header */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-background border-b border-border">
        <div className="flex items-center justify-center relative h-14 px-4">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-4 h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-base font-semibold">FAQs</h1>
        </div>
      </div>
      <div className="h-14" />

      <main className="flex-1">
        <div className="px-4 py-4 pb-24 max-w-4xl mx-auto">
          {/* Subtitle */}
          <p className="text-sm text-muted-foreground mb-3">
            Browse all frequently asked questions about VolleySmart.
          </p>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10 h-9"
            />
          </div>

          {isLoading && (
            <p className="py-8 text-center text-muted-foreground text-sm">
              Loading FAQs...
            </p>
          )}

          {!isLoading && error && (
            <p className="py-8 text-center text-red-600 text-sm">{error}</p>
          )}

          {!isLoading && !error && faqsByCategory.length === 0 && (
            <p className="py-8 text-center text-muted-foreground text-sm">
              No FAQs match your search.
            </p>
          )}

          {!isLoading &&
            !error &&
            faqsByCategory.map(([category, categoryFaqs]) => (
              <section key={category} className="mb-6">
                <h3 className="text-base font-semibold mb-2 text-primary">
                  {category}
                </h3>

                <div className="border-t border-border">
                  <Accordion type="single" collapsible>
                    {categoryFaqs.map((faq) => (
                      <AccordionItem
                        key={faq.id}
                        value={faq.id}
                        className="border-b border-border"
                      >
                        <AccordionTrigger
                          className="py-3 text-left text-sm font-medium text-foreground
                            hover:bg-muted/60 data-[state=open]:bg-muted transition-colors"
                        >
                          {faq.question}
                        </AccordionTrigger>

                        <AccordionContent className="text-sm text-muted-foreground">
                          <div className="prose prose-sm max-w-none prose-a:underline">
                            <ReactMarkdown>{faq.answer}</ReactMarkdown>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </section>
            ))}
        </div>
      </main>
    </div>
  );
};

export default FaqsPage;
