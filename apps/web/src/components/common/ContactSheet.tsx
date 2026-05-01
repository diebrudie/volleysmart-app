import { useState, useRef, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { ImagePlus, X } from "lucide-react";

type ContactReason =
  | "general_question"
  | "account_support"
  | "report_bug"
  | "feature_request";

interface ContactSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: string;
  forceLight?: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ContactSheet = ({
  open,
  onOpenChange,
  source,
  forceLight,
}: ContactSheetProps) => {
  const { t } = useTranslation("common");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [reason, setReason] = useState<ContactReason>("general_question");
  const [message, setMessage] = useState<string>("");
  const [acceptTerms, setAcceptTerms] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFeedback(t("contact.invalidImage"));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFeedback(t("contact.imageTooLarge"));
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setFeedback(null);
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!acceptTerms || isSubmitting) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      let attachmentUrl: string | null = null;

      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const fileName = `contact-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("contact-attachments")
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage
          .from("contact-attachments")
          .getPublicUrl(fileName);
        attachmentUrl = publicUrl;
      }

      const { error } = await supabase.from("contact_submissions").insert({
        name,
        email,
        reason,
        message,
        source: source ?? "unknown",
        attachment_url: attachmentUrl,
      });

      if (error) throw error;

      setFeedback(t("contact.successDescription"));
      setName("");
      setEmail("");
      setReason("general_question");
      setMessage("");
      setAcceptTerms(false);
      removeImage();
    } catch (error) {
      console.error("Error submitting contact form:", error);
      setFeedback(t("contact.errorDescription"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={`w-full sm:max-w-md flex flex-col overflow-visible ${
          forceLight ? "bg-white text-gray-900" : ""
        }`}
        aria-label="Contact form"
      >
        <SheetHeader className="px-6 pt-6 pb-4 text-left">
          <SheetTitle className={forceLight ? "text-gray-900" : undefined}>
            {t("contact.title")}
          </SheetTitle>
          <SheetDescription
            className={forceLight ? "text-gray-600" : undefined}
          >
            {t("contact.description")}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col gap-4 overflow-y-auto px-6 pb-4"
        >
          <div className="flex flex-col gap-1">
            <label
              htmlFor="contact-name"
              className="text-sm font-medium text-gray-900"
            >
              {t("contact.name")}
            </label>
            <input
              id="contact-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              placeholder={t("contact.namePlaceholder")}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="contact-email"
              className="text-sm font-medium text-gray-900"
            >
              {t("contact.email")}
            </label>
            <input
              id="contact-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              placeholder={t("contact.emailPlaceholder")}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="contact-reason"
              className="text-sm font-medium text-gray-900"
            >
              {t("contact.reason")}
            </label>
            <select
              id="contact-reason"
              value={reason}
              onChange={(event) =>
                setReason(event.target.value as ContactReason)
              }
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
            >
              <option value="general_question">{t("contact.reasonGeneral")}</option>
              <option value="account_support">{t("contact.reasonAccount")}</option>
              <option value="report_bug">{t("contact.reasonBug")}</option>
              <option value="feature_request">{t("contact.reasonFeature")}</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="contact-message"
              className="text-sm font-medium text-gray-900"
            >
              {t("contact.message")}
            </label>
            <textarea
              id="contact-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="mt-1 block w-full min-h-[120px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              placeholder={t("contact.messagePlaceholder")}
              required
            />
          </div>

          {/* Image attachment */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-900">
              {t("contact.attachment")}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt=""
                  className="h-24 w-auto rounded-lg border border-gray-300 object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 rounded-full bg-gray-800 p-0.5 text-white hover:bg-gray-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-md border border-dashed border-gray-300 px-3 py-2.5 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600"
              >
                <ImagePlus className="h-4 w-4" />
                {t("contact.addImage")}
              </button>
            )}
          </div>

          <label className="mt-2 flex items-start gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(event) => setAcceptTerms(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300"
            />
            <span>
              {t("contact.consent")}
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
              {t("contact.cancel")}
            </button>
            <button
              type="submit"
              disabled={!acceptTerms || isSubmitting}
              className="px-4 py-2 text-sm rounded-md bg-[hsl(var(--primary))] text-white hover:bg-[hsl(225,80%,28%)] disabled:opacity-60"
            >
              {isSubmitting ? t("contact.submitting") : t("contact.submit")}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default ContactSheet;
