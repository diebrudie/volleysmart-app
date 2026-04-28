import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
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
import { Check } from "lucide-react";

function createResetPasswordSchema(t: TFunction) {
  return z
    .object({
      password: z
        .string()
        .min(6, { message: t("validation:password.tooShort", { min: 6 }) }),
      confirmPassword: z
        .string()
        .min(6, { message: t("validation:password.tooShort", { min: 6 }) }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("auth:signup.passwordsDoNotMatch"),
      path: ["confirmPassword"],
    });
}

type ResetPasswordFormValues = z.infer<ReturnType<typeof createResetPasswordSchema>>;

const ResetPassword = () => {
  const { t } = useTranslation("auth");
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidLink, setIsValidLink] = useState(true);

  const resetPasswordSchema = useMemo(() => createResetPasswordSchema(t), [t]);
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    // Check if we have access to the reset token
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        setIsValidLink(false);
        toast({
          title: t("resetPassword.invalidLinkToast"),
          description: t("resetPassword.invalidLinkToastDescription"),
          variant: "destructive",
          duration: 2000,
        });
      }
    };

    checkSession();
  }, [toast]);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!isValidLink) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) throw error;

      setIsSuccess(true);

      toast({
        title: t("resetPassword.toastTitle"),
        description: t("resetPassword.toastDescription"),
        duration: 1500,
      });

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (error: unknown) {
      console.error("Password reset error:", error);
      toast({
        title: t("resetPassword.errorTitle"),
        description:
          error instanceof Error ? error.message : t("resetPassword.errorDefault"),
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidLink) {
    return (
      <AuthLayout>
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 w-full">
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
            {t("resetPassword.invalidLink")}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t("resetPassword.invalidLinkDescription")}
          </p>
          <Button variant="primary" asChild className="w-full">
            <Link to="/forgot-password">{t("resetPassword.requestNewLink")}</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 w-full">
        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
          {t("resetPassword.title")}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {t("resetPassword.subtitle")}
        </p>

        {isSuccess ? (
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">
              {t("resetPassword.passwordUpdated")}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t("resetPassword.passwordUpdatedDescription")}
            </p>
            <Button variant="primary" asChild>
              <Link to="/login">{t("resetPassword.backToLogin")}</Link>
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("resetPassword.newPassword")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t("resetPassword.newPasswordPlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("resetPassword.confirmPassword")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t("resetPassword.confirmPasswordPlaceholder")}
                        {...field}
                      />
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
                {isLoading ? t("resetPassword.resetting") : t("resetPassword.submit")}
              </Button>
            </form>
          </Form>
        )}
      </div>
    </AuthLayout>
  );
};

export default ResetPassword;
