"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";

const usernameSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens",
    ),
});

type UsernameData = z.infer<typeof usernameSchema>;

export default function NewUserPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<UsernameData>({
    resolver: zodResolver(usernameSchema),
  });

  const setUsernameMutation = api.auth.setUsername.useMutation({
    onSuccess: async () => {
      await update({ username: form.getValues("username") });
      router.push("/");
      router.refresh();
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
    },
  );

  const onSubmit = async (data: UsernameData) => {
    setIsLoading(true);
    setError(null);
    setUsernameMutation.mutate({ username: data.username });
    setIsLoading(false);
  };

  if (!session?.user) {
    return null;
  }

  if (session.user.username && !session.user.needsUsername) {
    router.push("/");
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            Welcome, {session.user.name ?? session.user.email}!
          </CardTitle>
          <CardDescription>
            Choose a username to complete your profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="johndoe"
                {...form.register("username")}
                disabled={isLoading}
              />
              {form.formState.errors.username && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.username.message}
                </p>
              )}
              {checkUsername.data && !checkUsername.data.available && (
                <p className="text-sm text-red-500">
                  Username is already taken
                </p>
              )}
              {checkUsername.data?.available && (
                <p className="text-sm text-green-500">Username is available</p>
              )}
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !checkUsername.data?.available}
            >
              {isLoading ? "Setting username..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
