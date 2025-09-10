import { getServerAuthSession } from "~/server/auth";
import { UserMenuClient } from "./user-menu.client";
import { Button } from "~/components/ui/button";
import Link from "next/link";

export async function UserMenu() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return (
      <Button asChild variant="outline">
        <Link href="/auth/signin">Sign In</Link>
      </Button>
    );
  }

  return <UserMenuClient initialSession={session} />;
}