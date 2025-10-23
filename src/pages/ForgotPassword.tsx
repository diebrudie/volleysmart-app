import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

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
        title: "Password reset email sent",
        description: "Check your email for a link to reset your password.",
        duration: 2500,
      });
    } catch (error: unknown) {
      console.error("Password reset error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to send password reset email.",
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
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Enter your email address and we'll send you a link to reset your
              password.
            </p>
            {isSubmitted ? (
              <div className="text-center py-6">
                <div className="mx-auto w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
                  <Mail className="h-7 w-7 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-medium mb-3 text-gray-900 dark:text-gray-100">
                  Check your email
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 px-4">
                  We've sent a password reset link to your email address.
                  <span className="block mt-2">
                    It may take a few minutes to arrive. Please check your spam
                    or junk folder if you don't see it.
                  </span>
                </p>
                <Button variant="primary" asChild className="mt-3">
                  <Link to="/login">Return to login</Link>
                </Button>
              </div>
            ) : (
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
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Email address" {...field} />
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
                      {isLoading ? "Sending..." : "Send reset link"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </div>

          <div className="flex justify-center mt-6">
            <Link
              to="/login"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Return to login
            </Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;
