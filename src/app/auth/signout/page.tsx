"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

export default function SignOutPage() {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Sign out</CardTitle>
        <CardDescription>We hope to see you again soon</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button className="w-full" onClick={handleSignOut}>Sign Out</Button>
        <Link href="/" className="text-center text-sm text-blue-600 hover:underline block">
          Go back home
        </Link>
      </CardContent>
    </Card>
  );
}