/**
 * Contact form — mobile counterpart of the PWA's ContactSheet
 * (apps/web/src/components/common/ContactSheet.tsx): inserts into
 * contact_submissions, then fires notify-contact-submission. Attachment
 * upload is omitted on mobile for now.
 */
import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { getSupabaseClient } from "@volleysmart/core";
import { Sheet } from "@/components/ui/Sheet";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";

type Props = {
  visible: boolean;
  onClose: () => void;
  source?: string;
};

type Reason =
  | "general_question"
  | "account_support"
  | "report_bug"
  | "feature_request";

export function ContactSheet({ visible, onClose, source }: Props) {
  const { t } = useTranslation("common");
  const theme = useTheme();
  const { user } = useAuth();
  const { data: player } = usePlayerProfile();

  const defaultName = [player?.first_name, player?.last_name]
    .filter(Boolean)
    .join(" ");
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(user?.email ?? "");
  const [reason, setReason] = useState<Reason>("general_question");
  const [message, setMessage] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const reasonOptions = [
    {
      value: "general_question" as const,
      label: t("contact.reasonGeneral", { defaultValue: "General question" }),
    },
    {
      value: "account_support" as const,
      label: t("contact.reasonAccount", { defaultValue: "Account support" }),
    },
    {
      value: "report_bug" as const,
      label: t("contact.reasonBug", { defaultValue: "Report a bug" }),
    },
    {
      value: "feature_request" as const,
      label: t("contact.reasonFeature", { defaultValue: "Feature request" }),
    },
  ];

  const canSubmit =
    name.trim() && email.trim() && message.trim() && acceptTerms;

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const supabase = getSupabaseClient();
      const record = {
        name: name.trim(),
        email: email.trim(),
        reason,
        message: message.trim(),
        source: source ?? "unknown",
        attachment_url: null,
      };
      const { error } = await supabase
        .from("contact_submissions")
        .insert(record);
      if (error) throw error;

      supabase.functions
        .invoke("notify-contact-submission", { body: { record } })
        .catch((e) => console.error("Email notification failed:", e));

      setIsSuccess(true);
      setMessage("");
      setAcceptTerms(false);
    } catch (e) {
      console.error("Error submitting contact form:", e);
      setErrorMsg(
        t("contact.errorDescription", {
          defaultValue:
            "Something went wrong while sending your message. Please try again later.",
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setErrorMsg(null);
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={handleClose}
      title={t("contact.title", { defaultValue: "Contact us" })}
      keyboardAware
    >
      {isSuccess ? (
        <View style={styles.success}>
          <Text style={[styles.successTitle, { color: theme.text }]}>
            {t("contact.successTitle", { defaultValue: "Message sent!" })}
          </Text>
          <Text
            style={[styles.successDescription, { color: theme.textSecondary }]}
          >
            {t("contact.successDescription", {
              defaultValue:
                "Thank you for your message! We will get back to you soon.",
            })}
          </Text>
          <Button
            title={t("contact.close", { defaultValue: "Close" })}
            onPress={handleClose}
          />
        </View>
      ) : (
        <View style={styles.form}>
          <Input
            label={t("contact.name", { defaultValue: "Name" })}
            value={name}
            onChangeText={setName}
            placeholder={t("contact.namePlaceholder", {
              defaultValue: "Your name",
            })}
          />
          <Input
            label={t("contact.email", { defaultValue: "Email" })}
            value={email}
            onChangeText={setEmail}
            placeholder={t("contact.emailPlaceholder", {
              defaultValue: "you@example.com",
            })}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Select
            label={t("contact.reason", { defaultValue: "Reason" })}
            options={reasonOptions}
            value={reason}
            onChange={(v) => setReason(v)}
          />
          <Input
            label={t("contact.message", { defaultValue: "Message" })}
            value={message}
            onChangeText={setMessage}
            placeholder={t("contact.messagePlaceholder", {
              defaultValue: "Type your message...",
            })}
            multiline
            numberOfLines={4}
            style={styles.messageInput}
          />
          <Checkbox
            checked={acceptTerms}
            onChange={setAcceptTerms}
            label={t("contact.consent", {
              defaultValue:
                "I accept that my data will be used to contact me regarding my request.",
            })}
          />
          {errorMsg ? (
            <Text style={[styles.error, { color: theme.destructive }]}>
              {errorMsg}
            </Text>
          ) : null}
          <Button
            title={
              isSubmitting
                ? t("contact.submitting", { defaultValue: "Sending..." })
                : t("contact.submit", { defaultValue: "Submit" })
            }
            onPress={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            loading={isSubmitting}
          />
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14, paddingBottom: 8 },
  messageInput: { minHeight: 96, textAlignVertical: "top" },
  error: { fontSize: 13 },
  success: { gap: 12, paddingVertical: 8 },
  successTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  successDescription: { fontSize: 14, textAlign: "center", marginBottom: 8 },
});
