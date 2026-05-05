import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TFunction } from "i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AuthLayout from "@/components/auth/AuthLayout";
import { ArrowLeft, Mail } from "lucide-react";

function createForgotPasswordSchema(t: TFunction) {
  return z.object({
    email: z.string().email({ message: t("validation:email.invalid") }),
  });
}

type ForgotPasswordFormValues = z.infer<ReturnType<typeof createForgotPasswordSchema>>;

const ForgotPassword = () => {
  const { t } = useTranslation("auth");
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const forgotPasswordSchema = useMemo(() => createForgotPasswordSchema(t), [t]);
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: window.location.origin + "/reset-password",
      });

      if (error) throw error;

      setIsSubmitted(true);

      toast({
        title: t("forgotPassword.toastTitle"),
        description: t("forgotPassword.toastDescription"),
        duration: 2000,
      });
    } catch (error: unknown) {
      console.error("Password reset error:", error);
      toast({
        title: t("forgotPassword.errorTitle"),
        description:
          error instanceof Error
            ? error.message
            : t("forgotPassword.errorDefault"),
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="flex flex-col min-h-screen items-center justify-center bg-gray-100">
        <div className="w-full max-w-xl px-6 sm:px-8 md:px-12">
          <Link to="/" className="inline-block">
            <img
              src="/logo-lightmode.svg"
              alt="VolleySmart"
              className="h-10 w-auto mb-7"
              loading="eager"
            />
          </Link>
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 w-full space-y-2">
            {isSubmitted ? (
              <div className="text-center py-6">
                <div className="mx-auto w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
                  <Mail className="h-7 w-7 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-medium mb-3 text-gray-900 dark:text-gray-100">
                  {t("forgotPassword.checkYourEmail")}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 px-4">
                  {t("forgotPassword.emailSentDescription")}
                </p>
                <Button variant="primary" asChild className="mt-3">
                  <Link to="/login">{t("forgotPassword.returnToLogin")}</Link>
                </Button>
              </div>
            ) : (
              <>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {t("forgotPassword.description")}
                </p>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <div className="grid grid-col gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("forgotPassword.email")}</FormLabel>
                            <FormControl>
                              <Input placeholder={t("forgotPassword.emailPlaceholder")} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        variant="primary"
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                      >
                        {isLoading ? t("forgotPassword.sending") : t("forgotPassword.sendResetLink")}
                      </Button>
                    </div>
                  </form>
                </Form>
                <div className="flex justify-center pt-4">
                  <Link
                    to="/login"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {t("forgotPassword.returnToLogin")}
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;
