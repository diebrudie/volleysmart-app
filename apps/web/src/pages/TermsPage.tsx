import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const TermsPage = () => {
  const { t } = useTranslation("legal");
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const lastScrollYRef = useRef(0);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollYRef.current;
      if (Math.abs(delta) < 4) return;
      if (delta > 0 && currentY > 80) {
        setIsHeaderHidden(true);
      } else {
        setIsHeaderHidden(false);
      }
      lastScrollYRef.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isAuthenticated]);

  const content = (
    <main className="flex-1">
      <div className="px-4 py-6 pb-24 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">{t("terms.title")}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {t("terms.lastUpdated")}
        </p>
        <div className="prose prose-sm max-w-none prose-a:underline prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-td:text-foreground prose-th:text-foreground">
          <ReactMarkdown>{t("terms.content")}</ReactMarkdown>
        </div>
      </div>
    </main>
  );

  useEffect(() => {
    if (isAuthenticated) return;
    const html = document.documentElement;
    const wasDark = html.classList.contains("dark");
    html.classList.remove("dark");
    return () => { if (wasDark) html.classList.add("dark"); };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="pt-16">{content}</div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div
        className={
          "fixed top-0 left-0 right-0 z-20 bg-background border-b border-border transition-transform duration-500 ease-out " +
          (isHeaderHidden ? "-translate-y-full" : "translate-y-0")
        }
      >
        <div className="flex items-center justify-center relative h-14 px-4">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-4 h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-base font-semibold">{t("terms.title")}</h1>
        </div>
      </div>
      <div className="h-14" />
      {content}
    </div>
  );
};

export default TermsPage;
