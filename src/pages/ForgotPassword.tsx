
import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
        redirectTo: window.location.origin + '/reset-password',
      });

      if (error) throw error;

      setIsSubmitted(true);
      
      toast({
        title: "Password reset email sent",
        description: "Check your email for a link to reset your password.",
      });
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="border-0 shadow-none">
        <CardHeader className="space-y-1 px-0 pt-0">
          <div className="flex items-center mb-4">
            <Link to="/login" className="text-gray-500 hover:text-gray-700 mr-2">
              <ArrowLeft size={16} />
            </Link>
            <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
          </div>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {isSubmitted ? (
            <div className="text-center py-6">
              <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Mail className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="text-xl font-medium mb-3">Check your email</h3>
              <p className="text-gray-600 mb-4 px-4">
                We've sent a password reset link to your email address. 
                <span className="block mt-2">
                  It may take a few minutes to arrive. Please check your spam or junk folder if you don't see it.
                </span>
              </p>
              <Button asChild className="mt-3">
                <Link to="/login">Return to login</Link>
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Send reset link"}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center px-0 pt-4">
          <Link to="/login" className="text-sm text-volleyball-primary hover:underline">
            Return to login
          </Link>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
};

export default ForgotPassword;
