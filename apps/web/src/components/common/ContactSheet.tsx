import { useState, FormEvent } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

type ContactReason =
  | "general_question"
  | "account_support"
  | "report_bug"
  | "feature_request";

interface ContactSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Optional string to know from which part of the app the contact comes.
   * Example: "homepage_faqs_section".
   */
  source?: string;
}

const CONTACT_WEBHOOK_URL = "https://webhook.placeholder.com";

const ContactSheet = ({ open, onOpenChange, source }: ContactSheetProps) => {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [reason, setReason] = useState<ContactReason>("general_question");
  const [message, setMessage] = useState<string>("");
  const [acceptTerms, setAcceptTerms] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!acceptTerms || isSubmitting) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        name,
        email,
        reason,
        message,
        acceptTerms,
        source: source ?? "unknown",
      };

      const response = await fetch(CONTACT_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook responded with status ${response.status}`);
      }

      setFeedback("Thank you for your message! We will get back to you soon.");
      setName("");
      setEmail("");
      setReason("general_question");
      setMessage("");
      setAcceptTerms(false);
    } catch (error) {
      console.error("Error submitting contact form:", error);
      setFeedback(
        "Something went wrong while sending your message. Please try again later."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col"
        aria-label="Contact form"
      >
        <SheetHeader className="mb-4">
          <SheetTitle>Contact us</SheetTitle>
          <SheetDescription>
            Send us a question, report a bug, or request a feature. We’ll get
            back to you as soon as we can.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col gap-4 overflow-y-auto pb-4"
        >
          <div className="flex flex-col gap-1">
            <label
              htmlFor="contact-name"
              className="text-sm font-medium text-gray-900"
            >
              Name
            </label>
            <input
              id="contact-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              placeholder="Your name"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="contact-email"
              className="text-sm font-medium text-gray-900"
            >
              Email
            </label>
            <input
              id="contact-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="contact-reason"
              className="text-sm font-medium text-gray-900"
            >
              Reason
            </label>
            <select
              id="contact-reason"
              value={reason}
              onChange={(event) =>
                setReason(event.target.value as ContactReason)
              }
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
            >
              <option value="general_question">General question</option>
              <option value="account_support">Account support</option>
              <option value="report_bug">Report a bug</option>
              <option value="feature_request">Feature request</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="contact-message"
              className="text-sm font-medium text-gray-900"
            >
              Message
            </label>
            <textarea
              id="contact-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="mt-1 block w-full min-h-[120px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              placeholder="Type your message..."
              required
            />
          </div>

          <label className="mt-2 flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(event) => setAcceptTerms(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span>
              I accept that my data will be used to contact me regarding my
              request.
            </span>
          </label>

          {feedback && (
            <p className="mt-2 text-xs text-muted-foreground">{feedback}</p>
          )}

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!acceptTerms || isSubmitting}
              className="px-4 py-2 text-sm rounded-md bg-[hsl(var(--primary))] text-white hover:bg-[hsl(225,80%,28%)] disabled:opacity-60"
            >
              {isSubmitting ? "Sending..." : "Submit"}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default ContactSheet;
