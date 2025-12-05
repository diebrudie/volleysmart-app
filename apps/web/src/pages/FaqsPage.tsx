import { useEffect, useMemo, useState, ChangeEvent } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";

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
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

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
      <Navbar />

      <main className="flex-1">
        <section className="pt-8 pb-16 sm:pt-24 sm:pb-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <header className="text-center mb-8 sm:mb-10">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                FAQs
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Browse all frequently asked questions about VolleySmart.
              </p>
            </header>

            {/* Search */}
            <div className="mb-10">
              <label
                htmlFor="faq-search"
                className="block text-sm font-medium text-foreground"
              >
                Search questions
              </label>
              <input
                id="faq-search"
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search by question title..."
                className="mt-2 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]"
              />
            </div>

            {isLoading && (
              <p className="py-8 text-center text-muted-foreground">
                Loading FAQs...
              </p>
            )}

            {!isLoading && error && (
              <p className="py-8 text-center text-red-600 text-sm">{error}</p>
            )}

            {!isLoading && !error && faqsByCategory.length === 0 && (
              <p className="py-8 text-center text-muted-foreground">
                No FAQs match your search.
              </p>
            )}

            {!isLoading &&
              !error &&
              faqsByCategory.map(([category, categoryFaqs]) => (
                <section key={category} className="mb-10">
                  <h3 className="text-xl sm:text-2xl font-semibold mb-4 text-[hsl(var(--primary))]">
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
                            className="group py-4 text-left text-base sm:text-lg font-medium 
             text-foreground hover:bg-muted/60 data-[state=open]:bg-muted 
             transition-colors"
                          >
                            {faq.question}
                          </AccordionTrigger>

                          <AccordionContent className="text-sm sm:text-base text-muted-foreground">
                            <div className="prose prose-sm sm:prose-base max-w-none prose-a:underline">
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
        </section>
      </main>
      {/* Footer should appear only for non-authenticated users */}
      {!isAuthenticated && <Footer />}
    </div>
  );
};

export default FaqsPage;
