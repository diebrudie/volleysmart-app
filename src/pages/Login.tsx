import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
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
import { useAuth } from "@/contexts/AuthContext";
import AuthLayout from "@/components/auth/AuthLayout";
import { supabase } from "@/integrations/supabase/client";
import { Spinner } from "@/components/ui/spinner";

// Validation schema
const LoginSchema = z.object({
  email: z.string().email("Please enter a valid email."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type LoginValues = z.infer<typeof LoginSchema>;

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    setIsSubmitting(true);
    try {
      // AuthContext.login throws on error; no return payload to destructure
      await login(values.email, values.password);
      navigate("/start");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Please try again.";
      toast({
        title: "Sign in failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2 lg:gap-x-12">
        {/* Left: Logo + Headline + Form */}
        <div className="flex items-center">
          <div className="w-full max-w-[500px] px-6 sm:px-8 md:px-12 lg:px-12 lg:ml-auto lg:mr-12">
            <Link to="/" className="inline-block">
              <img
                src="/volleyball.svg"
                alt="VolleySmart"
                className="h-10 w-auto"
                loading="eager"
              />
            </Link>

            <h1 className="mt-10 text-3xl font-semibold tracking-tight">
              Sign in to VolleySmart
            </h1>

            <div className="mt-8">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            placeholder="name@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            autoComplete="current-password"
                            placeholder="Your password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Signing in..." : "Sign in"}
                  </Button>
                </form>
              </Form>
            </div>

            <p className="mt-6 text-sm text-slate-600">
              Forgot your password?{" "}
              <Link
                to="/forgot-password"
                className="text-blue-600 hover:underline"
              >
                Reset it here
              </Link>
              .
            </p>
            <p className="mt-2 text-sm text-slate-600">
              New to VolleySmart?{" "}
              <Link to="/signup" className="text-blue-600 hover:underline">
                Create an account
              </Link>{" "}
              instead
            </p>
          </div>
        </div>

        {/* Right: Image (desktop only) */}
        <div className="relative hidden items-center justify-center p-8 lg:flex">
          <div className="h-[560px] w-full max-w-[520px] overflow-hidden rounded-2xl">
            <img
              src="/img-volleyball-ball-login-screen.jpg"
              alt="Volleyball"
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Login;
