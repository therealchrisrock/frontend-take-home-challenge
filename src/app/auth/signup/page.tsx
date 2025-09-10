"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import AuthSplitLayout from "~/components/auth/auth-split-layout";
import { api } from "~/trpc/react";

const signupSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    username: z
      .string()
      .min(3)
      .max(20)
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "Username can only contain letters, numbers, underscores, and hyphens"
      ),
    name: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignupData = z.infer<typeof signupSchema>;

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const form = useForm<SignupData>({
    resolver: zodResolver(signupSchema),
  });

  const registerMutation = api.auth.register.useMutation({
    onSuccess: async () => {
      const result = await signIn("credentials", {
        emailOrUsername: form.getValues("username"),
        password: form.getValues("password"),
        redirect: false,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const checkUsername = api.auth.checkUsername.useQuery(
    { username: form.watch("username") ?? "" },
    {
      enabled: !!form.watch("username") && form.watch("username").length >= 3,
      refetchOnWindowFocus: false,
    }
  );

  const onSignUp = async (data: SignupData) => {
    setIsLoading(true);
    setError(null);
    registerMutation.mutate({
      email: data.email,
      password: data.password,
      username: data.username,
      name: data.name,
    });
    setIsLoading(false);
  };

  return (
    <AuthSplitLayout
      imageSrc="/rogue.png"
      imageAlt="Checkers"
      reverse
      brandName="Birdseye Checkers"
      brandHref="/"
    >
      <div className="mb-6 space-y-1 text-center md:text-left">
        <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
        <p className="text-sm text-muted-foreground">Enter your details below to create your account</p>
      </div>
      <form onSubmit={form.handleSubmit(onSignUp)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            type="email"
            placeholder="you@example.com"
            {...form.register("email")}
            disabled={isLoading}
          />
          {form.formState.errors.email && (
            <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-username">Username</Label>
          <Input
            id="signup-username"
            type="text"
            placeholder="Grootenberry"
            {...form.register("username")}
            disabled={isLoading}
          />
          {form.formState.errors.username && (
            <p className="text-sm text-red-500">{form.formState.errors.username.message}</p>
          )}
          {checkUsername.data && !checkUsername.data.available && (
            <p className="text-sm text-red-500">Username is already taken</p>
          )}
          {checkUsername.data?.available && (
            <p className="text-sm text-green-500">Username is available</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-name">Name (optional)</Label>
          <Input
            id="signup-name"
            type="text"
            placeholder="John Doe"
            {...form.register("name")}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            type="password"
            {...form.register("password")}
            disabled={isLoading}
          />
          {form.formState.errors.password && (
            <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-confirm-password">Confirm Password</Label>
          <Input
            id="signup-confirm-password"
            type="password"
            {...form.register("confirmPassword")}
            disabled={isLoading}
          />
          {form.formState.errors.confirmPassword && (
            <p className="text-sm text-red-500">{form.formState.errors.confirmPassword.message}</p>
          )}
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" className="w-full" disabled={isLoading || !checkUsername.data?.available}>
          {isLoading ? "Creating account..." : "Sign Up"}
        </Button>
        <div className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/auth/signin" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </div>
      </form>
    </AuthSplitLayout>
  );
}