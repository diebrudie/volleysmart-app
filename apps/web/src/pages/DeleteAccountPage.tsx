import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

/**
 * Public account/data deletion instructions page.
 *
 * Required by Google Play's data-deletion policy: users (including those who
 * can no longer sign in) must have a web-accessible way to learn how to
 * delete their account and data. Reachable at /delete-account without login.
 */
const SUPPORT_EMAIL = "support@volleysmart.app";

const DeleteAccountPage = () => {
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
      setIsHeaderHidden(delta > 0 && currentY > 80);
      lastScrollYRef.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) return;
    const html = document.documentElement;
    const wasDark = html.classList.contains("dark");
    html.classList.remove("dark");
    return () => {
      if (wasDark) html.classList.add("dark");
    };
  }, [isAuthenticated]);

  const content = (
    <main className="flex-1">
      <div className="px-4 py-6 pb-24 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">
          Delete your VolleySmart account
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          How to permanently delete your account and associated data.
        </p>

        <div className="prose prose-sm max-w-none prose-a:underline prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground">
          <h2>Delete from within the app</h2>
          <ol>
            <li>Open VolleySmart and sign in.</li>
            <li>
              Go to <strong>Profile</strong> and open the profile editor.
            </li>
            <li>
              Tap <strong>Delete Account</strong> and confirm.
            </li>
          </ol>
          <p>
            Your account is deleted immediately and you are signed out. This
            action cannot be undone.
          </p>

          <h2>If you can no longer sign in</h2>
          <p>
            Email{" "}
            <a href={`mailto:${SUPPORT_EMAIL}?subject=Account%20deletion%20request`}>
              {SUPPORT_EMAIL}
            </a>{" "}
            from the address associated with your account and ask us to delete
            it. We will verify ownership and remove your account within 30 days.
          </p>

          <h2>What is deleted</h2>
          <ul>
            <li>Your login and authentication data.</li>
            <li>Your profile (name, photo, position, biography, and settings).</li>
            <li>Your club memberships and notification preferences.</li>
          </ul>

          <h2>What is retained</h2>
          <p>
            To keep shared game and event records accurate for the other players
            you played with, your <strong>name remains visible in past game and
            event history</strong>. This information is retained as part of those
            shared records and is no longer linked to a personal account.
          </p>

          <p>
            Questions? Contact us at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
        </div>
      </div>
    </main>
  );

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
          <h1 className="text-base font-semibold">Delete account</h1>
        </div>
      </div>
      <div className="h-14" />
      {content}
    </div>
  );
};

export default DeleteAccountPage;
