"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AvatarUpload } from "~/components/AvatarUpload";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const form = useForm<UsernameData>({
    resolver: zodResolver(usernameSchema),
    defaultValues: {
      // Pre-fill with a suggested username based on display name
      username: session?.user?.name ?
        session.user.name.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) :
        "",
    },
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

  const handleAvatarUpload = (newAvatarUrl: string) => {
    setAvatarUrl(newAvatarUrl);
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
            Complete your profile to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Upload Section */}
          <div className="space-y-2">
            <Label>Profile Picture</Label>
            <AvatarUpload
              currentAvatarUrl={session.user.image}
              onUploadComplete={handleAvatarUpload}
            />
            <p className="text-xs text-muted-foreground">
              Upload a profile picture (optional)
            </p>
          </div>

          {/* Username Form */}
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
              <p className="text-xs text-muted-foreground">
                Choose a unique username (3-20 characters, letters, numbers, underscores, and hyphens only)
              </p>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !checkUsername.data?.available}
            >
              {isLoading ? "Setting up profile..." : "Complete Setup"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
